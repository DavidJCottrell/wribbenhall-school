"use server"

import { randomBytes } from "node:crypto"

import { del } from "@vercel/blob"
import { and, count, eq, ne } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { headers } from "next/headers"
import { z } from "zod"

import { getDb } from "@/db"
import { child, childUpdateAttachment, childUpdate, guardianship, staffAssignment, user as userTable } from "@/db/schema"
import { getAuth } from "@/lib/auth/auth"
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session"
import {
  assignStaffSchema,
  createPupilSchema,
  createUserSchema,
  linkGuardianSchema,
} from "@/lib/forms/schemas"

type Failure = { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }
export type AdminResult<T extends object = object> = ({ ok: true } & T) | Failure

const NOT_ALLOWED: Failure = { ok: false, message: "You don't have permission to do that." }

// Every action re-checks the role, because the client can call any exported action directly.
async function currentAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  return user?.role === "admin" && !user.mustChangePassword ? user : null
}

function invalid(error: z.ZodError): Failure {
  return {
    ok: false,
    message: "Some answers need checking. Correct the highlighted fields and try again.",
    fieldErrors: z.flattenError(error).fieldErrors,
  }
}

function generatePassword() {
  return randomBytes(12).toString("base64url")
}

const uuid = z.uuid()

export type TemporaryCredentials = { email: string; password: string }

export async function createUser(values: unknown): Promise<AdminResult<{ credentials: TemporaryCredentials }>> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsed = createUserSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const email = parsed.data.email.toLowerCase()
  const password = generatePassword()

  try {
    const created = await getAuth().api.createUser({
      body: { email, name: parsed.data.name, password },
      headers: await headers(),
    })
    // The admin plugin only types "user" and "admin" roles, so the role is set directly.
    await getDb()
      .update(userTable)
      .set({ role: parsed.data.role, mustChangePassword: true })
      .where(eq(userTable.id, created.user.id))
  } catch (error) {
    const exists = error instanceof Error && /exist/i.test(error.message)
    if (!exists) console.error("[admin] failed to create user", error)
    return {
      ok: false,
      message: exists ? "Someone with that email address already has a login." : "The login couldn't be created. Please try again.",
      fieldErrors: exists ? { email: ["This email address is already in use"] } : undefined,
    }
  }

  return { ok: true, credentials: { email, password } }
}

export async function resetPassword(userId: unknown): Promise<AdminResult<{ credentials: TemporaryCredentials }>> {
  const admin = await currentAdmin()
  if (!admin) return NOT_ALLOWED

  const parsedId = personId(userId)
  if (!parsedId) return { ok: false, message: "That person could not be found." }

  const [target] = await getDb().select({ email: userTable.email }).from(userTable).where(eq(userTable.id, parsedId))
  if (!target) return { ok: false, message: "That person could not be found." }

  const password = generatePassword()
  try {
    const auth = getAuth()
    const requestHeaders = await headers()
    await auth.api.setUserPassword({ body: { userId: parsedId, newPassword: password }, headers: requestHeaders })
    // Signs them out everywhere, except the admin's own session.
    if (parsedId !== admin.id) await auth.api.revokeUserSessions({ body: { userId: parsedId }, headers: requestHeaders })
    await getDb().update(userTable).set({ mustChangePassword: true }).where(eq(userTable.id, parsedId))
  } catch (error) {
    console.error("[admin] failed to reset password", error)
    return { ok: false, message: "The password couldn't be reset. Please try again." }
  }

  return { ok: true, credentials: { email: target.email, password } }
}

export async function setUserDisabled(userId: unknown, disabled: boolean): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return NOT_ALLOWED

  const parsedId = personId(userId)
  if (!parsedId) return { ok: false, message: "That person could not be found." }
  if (parsedId === admin.id) return { ok: false, message: "You can't disable your own login." }

  if (disabled) {
    const [target] = await getDb().select({ role: userTable.role }).from(userTable).where(eq(userTable.id, parsedId))
    if (target?.role === "admin" && !(await hasOtherEnabledAdmin(parsedId))) return LAST_ADMIN
  }

  try {
    const auth = getAuth()
    const requestHeaders = await headers()
    if (disabled) await auth.api.banUser({ body: { userId: parsedId }, headers: requestHeaders })
    else await auth.api.unbanUser({ body: { userId: parsedId }, headers: requestHeaders })
  } catch (error) {
    console.error("[admin] failed to change login status", error)
    return { ok: false, message: "That couldn't be changed. Please try again." }
  }

  return { ok: true }
}

async function hasOtherEnabledAdmin(excludingUserId: string) {
  const [row] = await getDb()
    .select({ total: count() })
    .from(userTable)
    .where(and(eq(userTable.role, "admin"), eq(userTable.banned, false), ne(userTable.id, excludingUserId)))
  return (row?.total ?? 0) > 0
}

const LAST_ADMIN: Failure = { ok: false, message: "There must always be at least one active administrator." }

// Better Auth ids are opaque strings, not UUIDs, so only check they are sensible text.
function personId(value: unknown): string | null {
  const parsed = z.string().min(1).max(64).safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function createPupil(values: unknown): Promise<AdminResult<{ pupilId: string }>> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsed = createPupilSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const [created] = await getDb().insert(child).values(parsed.data).returning({ id: child.id })
  return { ok: true, pupilId: created.id }
}

async function roleOf(userId: string) {
  const [row] = await getDb().select({ role: userTable.role }).from(userTable).where(eq(userTable.id, userId))
  return row?.role
}

export async function linkGuardian(childId: unknown, values: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  const parsed = linkGuardianSchema.safeParse(values)
  if (!parsedChildId.success) return { ok: false, message: "That pupil could not be found." }
  if (!parsed.success) return invalid(parsed.error)
  if ((await roleOf(parsed.data.userId)) !== "parent") return { ok: false, message: "Only parent logins can be linked here." }

  await getDb()
    .insert(guardianship)
    .values({ childId: parsedChildId.data, userId: parsed.data.userId, relationship: parsed.data.relationship || null })
    .onConflictDoNothing()
  return { ok: true }
}

export async function unlinkGuardian(childId: unknown, userId: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  const parsedUserId = personId(userId)
  if (!parsedChildId.success || !parsedUserId) return { ok: false, message: "That link could not be found." }

  await getDb()
    .delete(guardianship)
    .where(and(eq(guardianship.childId, parsedChildId.data), eq(guardianship.userId, parsedUserId)))
  return { ok: true }
}

export async function assignStaff(childId: unknown, values: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  const parsed = assignStaffSchema.safeParse(values)
  if (!parsedChildId.success) return { ok: false, message: "That pupil could not be found." }
  if (!parsed.success) return invalid(parsed.error)
  if ((await roleOf(parsed.data.userId)) !== "staff") return { ok: false, message: "Only staff logins can be assigned here." }

  await getDb()
    .insert(staffAssignment)
    .values({ childId: parsedChildId.data, userId: parsed.data.userId })
    .onConflictDoNothing()
  return { ok: true }
}

export async function unassignStaff(childId: unknown, userId: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  const parsedUserId = personId(userId)
  if (!parsedChildId.success || !parsedUserId) return { ok: false, message: "That assignment could not be found." }

  await getDb()
    .delete(staffAssignment)
    .where(and(eq(staffAssignment.childId, parsedChildId.data), eq(staffAssignment.userId, parsedUserId)))
  return { ok: true }
}

const UNIQUE_VIOLATION = "23505"

// Single queries wrap the database error as `cause`. Batches throw it directly.
function isUniqueViolation(error: unknown) {
  const candidates = [error, error instanceof Error ? error.cause : undefined]
  return candidates.some((candidate) => (candidate as { code?: string } | undefined)?.code === UNIQUE_VIOLATION)
}

export async function updateUser(userId: unknown, values: unknown): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return NOT_ALLOWED

  const parsedId = personId(userId)
  const parsed = createUserSchema.safeParse(values)
  if (!parsedId) return { ok: false, message: "That person could not be found." }
  if (!parsed.success) return invalid(parsed.error)

  const db = getDb()
  const [target] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, parsedId))
  if (!target) return { ok: false, message: "That person could not be found." }

  const roleChanged = target.role !== parsed.data.role
  if (roleChanged) {
    if (parsedId === admin.id) return { ok: false, message: "You can't change your own role." }
    if (target.role === "admin" && !(await hasOtherEnabledAdmin(parsedId))) return LAST_ADMIN
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db
      .update(userTable)
      .set({ name: parsed.data.name, email: parsed.data.email.toLowerCase(), role: parsed.data.role, updatedAt: new Date() })
      .where(eq(userTable.id, parsedId)),
  ]
  // Leaving a role drops the pupil links that only made sense for it.
  if (roleChanged && target.role === "parent") statements.push(db.delete(guardianship).where(eq(guardianship.userId, parsedId)))
  if (roleChanged && target.role === "staff") statements.push(db.delete(staffAssignment).where(eq(staffAssignment.userId, parsedId)))

  try {
    await db.batch(statements)
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: "Someone with that email address already has a login.",
        fieldErrors: { email: ["This email address is already in use"] },
      }
    }
    console.error("[admin] failed to update user", error)
    return { ok: false, message: "The changes couldn't be saved. Please try again." }
  }
  return { ok: true }
}

export async function deleteUser(userId: unknown, confirmation: unknown): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return NOT_ALLOWED

  const parsedId = personId(userId)
  if (!parsedId) return { ok: false, message: "That person could not be found." }
  if (parsedId === admin.id) return { ok: false, message: "You can't delete your own login." }

  const [target] = await getDb().select({ email: userTable.email, role: userTable.role }).from(userTable).where(eq(userTable.id, parsedId))
  if (!target) return { ok: false, message: "That person could not be found." }
  if (typeof confirmation !== "string" || confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { ok: false, message: "Type their email address to confirm." }
  }
  if (target.role === "admin" && !(await hasOtherEnabledAdmin(parsedId))) return LAST_ADMIN

  try {
    // Their sessions and links go with them. Updates they wrote stay on the pupil's record.
    await getAuth().api.removeUser({ body: { userId: parsedId }, headers: await headers() })
  } catch (error) {
    console.error("[admin] failed to delete user", error)
    return { ok: false, message: "The login couldn't be deleted. Please try again." }
  }
  return { ok: true }
}

export async function updatePupil(childId: unknown, values: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  const parsed = createPupilSchema.safeParse(values)
  if (!parsedChildId.success) return { ok: false, message: "That pupil could not be found." }
  if (!parsed.success) return invalid(parsed.error)

  const updated = await getDb().update(child).set(parsed.data).where(eq(child.id, parsedChildId.data)).returning({ id: child.id })
  return updated.length > 0 ? { ok: true } : { ok: false, message: "That pupil could not be found." }
}

export async function deletePupil(childId: unknown, confirmation: unknown): Promise<AdminResult> {
  if (!(await currentAdmin())) return NOT_ALLOWED

  const parsedChildId = uuid.safeParse(childId)
  if (!parsedChildId.success) return { ok: false, message: "That pupil could not be found." }

  const db = getDb()
  const [pupil] = await db.select({ firstName: child.firstName, lastName: child.lastName }).from(child).where(eq(child.id, parsedChildId.data))
  if (!pupil) return { ok: false, message: "That pupil could not be found." }

  const expected = `${pupil.firstName} ${pupil.lastName}`.toLowerCase()
  if (typeof confirmation !== "string" || confirmation.trim().replace(/\s+/g, " ").toLowerCase() !== expected) {
    return { ok: false, message: "Type the pupil's full name to confirm." }
  }

  const files = await db
    .select({ pathname: childUpdateAttachment.pathname })
    .from(childUpdateAttachment)
    .innerJoin(childUpdate, eq(childUpdate.id, childUpdateAttachment.updateId))
    .where(eq(childUpdate.childId, parsedChildId.data))

  try {
    // Updates, attachment rows and links are removed by the database (cascade).
    await db.delete(child).where(eq(child.id, parsedChildId.data))
  } catch (error) {
    console.error("[admin] failed to delete pupil", error)
    return { ok: false, message: "The pupil couldn't be deleted. Please try again." }
  }

  // Best effort. The cleanup job removes anything this misses.
  if (files.length > 0) {
    try {
      await del(files.map((file) => file.pathname))
    } catch (error) {
      console.error("[admin] couldn't remove a deleted pupil's files", error)
    }
  }
  return { ok: true }
}
