"use server"

import { randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { child, guardianship, pupilContact, user as userTable } from "@/db/schema"
import { invalidInput, notFound, type ActionFailure, type ActionResult } from "@/lib/action-result"
import { isUniqueViolation } from "@/lib/db-errors"
import { recordAudit } from "@/lib/audit"
import { deleteLogin, revokeAllSessions, setBanned, setPassword } from "@/lib/auth/account-admin"
import { getAuth } from "@/lib/auth/auth"
import { PERMISSIONS, isUserKind, normalizePermissions, type Permission } from "@/lib/auth/permissions"
import { getActionUser } from "@/lib/auth/session"
import { LAST_LOGIN_MANAGER_MESSAGE, hasOtherLoginManager } from "@/lib/auth/user-guards"
import { createUserSchema } from "@/lib/forms/schemas"

export type TemporaryCredentials = { email: string; password: string }

const generatePassword = () => randomBytes(12).toString("base64url")

// Better Auth ids are opaque strings, not UUIDs, so only check they are sensible text.
function loginId(value: unknown): string | null {
  const parsed = z.string().min(1).max(64).safeParse(value)
  return parsed.success ? parsed.data : null
}

const emailInUse: ActionFailure = {
  ok: false,
  message: "Someone with that email address already has a login.",
  fieldErrors: { email: ["This email address is already in use"] },
}

// Parents never hold permissions. Staff get the permissions that were ticked, plus whatever those include.
const permissionsFor = (kind: string, requested: readonly Permission[]) => (kind === "staff" ? normalizePermissions(requested) : [])

function describeChange(before: readonly Permission[], after: readonly Permission[]) {
  const added = after.filter((permission) => !before.includes(permission)).map((permission) => PERMISSIONS[permission].label)
  const removed = before.filter((permission) => !after.includes(permission)).map((permission) => PERMISSIONS[permission].label)
  return [added.length ? `added ${added.join(", ")}` : null, removed.length ? `removed ${removed.join(", ")}` : null].filter(Boolean).join("; ")
}

export async function createUser(values: unknown): Promise<ActionResult<{ credentials: TemporaryCredentials; userId: string }>> {
  const gate = await getActionUser("users.manage")
  if (!gate.ok) return gate

  const parsed = createUserSchema.safeParse(values)
  if (!parsed.success) return invalidInput(parsed.error)

  const email = parsed.data.email.toLowerCase()
  const password = generatePassword()
  const permissions = permissionsFor(parsed.data.kind, parsed.data.permissions)
  let userId: string

  try {
    const created = await getAuth().api.createUser({ body: { email, name: parsed.data.name, password } })
    // The plugin only knows its own roles, so the kind and permissions are set directly.
    await getDb()
      .update(userTable)
      .set({ role: parsed.data.kind, permissions, mustChangePassword: true })
      .where(eq(userTable.id, created.user.id))
    userId = created.user.id

    await recordAudit(gate.user, {
      action: "create",
      subject: "login",
      subjectId: created.user.id,
      summary: `Created a ${parsed.data.kind} login for ${parsed.data.name}${permissions.length ? ` with ${permissions.length} permissions` : ""}`,
    })
  } catch (error) {
    const exists = error instanceof Error && /exist/i.test(error.message)
    if (!exists) console.error("[logins] failed to create user", error)
    return exists ? emailInUse : { ok: false, message: "The login couldn't be created. Please try again." }
  }

  return { ok: true, credentials: { email, password }, userId }
}

export async function updateUser(userId: unknown, values: unknown): Promise<ActionResult> {
  const gate = await getActionUser("users.manage")
  if (!gate.ok) return gate
  const actor = gate.user

  const targetId = loginId(userId)
  const parsed = createUserSchema.safeParse(values)
  if (!targetId) return notFound("person")
  if (!parsed.success) return invalidInput(parsed.error)

  const db = getDb()
  const [target] = await db
    .select({ name: userTable.name, role: userTable.role, permissions: userTable.permissions, banned: userTable.banned })
    .from(userTable)
    .where(eq(userTable.id, targetId))
  if (!target || !isUserKind(target.role)) return notFound("person")

  const before = normalizePermissions(target.permissions)
  const after = permissionsFor(parsed.data.kind, parsed.data.permissions)
  const kindChanged = target.role !== parsed.data.kind

  if (targetId === actor.id) {
    if (kindChanged) return { ok: false, message: "You can't change your own kind of login." }
    if (!after.includes("users.manage")) return { ok: false, message: "You can't remove your own ability to manage logins." }
  }

  const managedBefore = target.role === "staff" && !target.banned && before.includes("users.manage")
  const managesAfter = after.includes("users.manage")
  if (managedBefore && !managesAfter && !(await hasOtherLoginManager(targetId))) {
    return { ok: false, message: LAST_LOGIN_MANAGER_MESSAGE }
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db
      .update(userTable)
      .set({ name: parsed.data.name, email: parsed.data.email.toLowerCase(), role: parsed.data.kind, permissions: after, updatedAt: new Date() })
      .where(eq(userTable.id, targetId)),
  ]
  // Leaving a kind drops the links that only made sense for it.
  if (kindChanged && target.role === "parent") {
    statements.push(db.delete(guardianship).where(eq(guardianship.userId, targetId)))
    statements.push(db.update(pupilContact).set({ linkedUserId: null }).where(eq(pupilContact.linkedUserId, targetId)))
  }
  if (kindChanged && target.role === "staff") {
    statements.push(db.update(child).set({ keyWorkerId: null }).where(eq(child.keyWorkerId, targetId)))
  }

  try {
    await db.batch(statements)
  } catch (error) {
    if (isUniqueViolation(error)) return emailInUse
    console.error("[logins] failed to update user", error)
    return { ok: false, message: "The changes couldn't be saved. Please try again." }
  }

  const permissionChange = describeChange(before, after)
  await recordAudit(actor, {
    action: "update",
    subject: permissionChange || kindChanged ? "permissions" : "login",
    subjectId: targetId,
    summary: `Updated the login for ${target.name}${kindChanged ? `, now ${parsed.data.kind}` : ""}${permissionChange ? `. Permissions: ${permissionChange}` : ""}`,
  })
  return { ok: true }
}

export async function resetPassword(userId: unknown): Promise<ActionResult<{ credentials: TemporaryCredentials }>> {
  const gate = await getActionUser("users.manage")
  if (!gate.ok) return gate

  const targetId = loginId(userId)
  if (!targetId) return notFound("person")

  const db = getDb()
  const [target] = await db.select({ email: userTable.email, name: userTable.name }).from(userTable).where(eq(userTable.id, targetId))
  if (!target) return notFound("person")

  const password = generatePassword()
  try {
    await setPassword(targetId, password)
    // Signs them out everywhere, except the person doing the reset.
    if (targetId !== gate.user.id) await revokeAllSessions(targetId)
    await db.update(userTable).set({ mustChangePassword: true }).where(eq(userTable.id, targetId))
  } catch (error) {
    console.error("[logins] failed to reset password", error)
    return { ok: false, message: "The password couldn't be reset. Please try again." }
  }

  await recordAudit(gate.user, { action: "update", subject: "password", subjectId: targetId, summary: `Reset the password for ${target.name}` })
  return { ok: true, credentials: { email: target.email, password } }
}

export async function setUserDisabled(userId: unknown, disabled: boolean): Promise<ActionResult> {
  const gate = await getActionUser("users.manage")
  if (!gate.ok) return gate

  const targetId = loginId(userId)
  if (!targetId) return notFound("person")
  if (targetId === gate.user.id) return { ok: false, message: "You can't disable your own login." }

  const [target] = await getDb()
    .select({ name: userTable.name, role: userTable.role, permissions: userTable.permissions })
    .from(userTable)
    .where(eq(userTable.id, targetId))
  if (!target) return notFound("person")

  const isManager = target.role === "staff" && normalizePermissions(target.permissions).includes("users.manage")
  if (disabled && isManager && !(await hasOtherLoginManager(targetId))) return { ok: false, message: LAST_LOGIN_MANAGER_MESSAGE }

  try {
    await setBanned(targetId, disabled)
  } catch (error) {
    console.error("[logins] failed to change login status", error)
    return { ok: false, message: "That couldn't be changed. Please try again." }
  }

  await recordAudit(gate.user, {
    action: "update",
    subject: "login",
    subjectId: targetId,
    summary: `${disabled ? "Disabled" : "Enabled"} the login for ${target.name}`,
  })
  return { ok: true }
}

export async function deleteUser(userId: unknown, confirmation: unknown): Promise<ActionResult> {
  const gate = await getActionUser("users.manage")
  if (!gate.ok) return gate

  const targetId = loginId(userId)
  if (!targetId) return notFound("person")
  if (targetId === gate.user.id) return { ok: false, message: "You can't delete your own login." }

  const [target] = await getDb()
    .select({ email: userTable.email, name: userTable.name, role: userTable.role, permissions: userTable.permissions })
    .from(userTable)
    .where(eq(userTable.id, targetId))
  if (!target) return notFound("person")

  if (typeof confirmation !== "string" || confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { ok: false, message: "Type their email address to confirm." }
  }
  const isManager = target.role === "staff" && normalizePermissions(target.permissions).includes("users.manage")
  if (isManager && !(await hasOtherLoginManager(targetId))) return { ok: false, message: LAST_LOGIN_MANAGER_MESSAGE }

  try {
    // Their sessions and links go with them. Things they wrote stay, with the author cleared.
    await deleteLogin(targetId)
  } catch (error) {
    console.error("[logins] failed to delete user", error)
    return { ok: false, message: "The login couldn't be deleted. Please try again." }
  }

  await recordAudit(gate.user, { action: "delete", subject: "login", subjectId: targetId, summary: `Deleted the login for ${target.name}` })
  return { ok: true }
}

