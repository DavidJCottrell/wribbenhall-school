"use server"

import { randomBytes } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"

import { getDb } from "@/db"
import { child, guardianship, staffAssignment, user as userTable } from "@/db/schema"
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
  return user?.role === "admin" ? user : null
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
    await getDb().update(userTable).set({ role: parsed.data.role }).where(eq(userTable.id, created.user.id))
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
