"use server"

import { del } from "@vercel/blob"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { getDb } from "@/db"
import { child, guardianship, pupilContact, recordFile, user as userTable } from "@/db/schema"
import { invalidInput, notFound, type ActionResult } from "@/lib/action-result"
import { recordAudit } from "@/lib/audit"
import { getActionUser } from "@/lib/auth/session"
import { contactSchema, createPupilSchema, linkGuardianSchema, pupilProfileSchema } from "@/lib/forms/schemas"
import { pupilDisplayName } from "@/lib/portal/pupils"

const uuid = z.uuid()

// Better Auth ids are opaque strings, not UUIDs.
function loginId(value: unknown): string | null {
  const parsed = z.string().min(1).max(64).safeParse(value)
  return parsed.success ? parsed.data : null
}

const orNull = (value: string) => (value === "" ? null : value)

async function kindOf(userId: string) {
  const [row] = await getDb().select({ role: userTable.role }).from(userTable).where(eq(userTable.id, userId))
  return row?.role
}

export async function createPupil(values: unknown): Promise<ActionResult<{ pupilId: string }>> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsed = createPupilSchema.safeParse(values)
  if (!parsed.success) return invalidInput(parsed.error)

  const [created] = await getDb().insert(child).values(parsed.data).returning({ id: child.id })
  await recordAudit(gate.user, {
    action: "create",
    subject: "pupil",
    subjectId: created.id,
    childId: created.id,
    summary: `Added the pupil ${parsed.data.firstName} ${parsed.data.lastName}`,
  })
  return { ok: true, pupilId: created.id }
}

export async function updatePupil(childId: unknown, values: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  const parsed = pupilProfileSchema.safeParse(values)
  if (!parsedChildId.success) return notFound("pupil")
  if (!parsed.success) return invalidInput(parsed.error)

  const keyWorkerId = orNull(parsed.data.keyWorkerId)
  if (keyWorkerId && (await kindOf(keyWorkerId)) !== "staff") {
    return { ok: false, message: "The key worker must be a member of staff.", fieldErrors: { keyWorkerId: ["Choose a member of staff"] } }
  }

  const updated = await getDb()
    .update(child)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      preferredName: orNull(parsed.data.preferredName),
      yearGroup: parsed.data.yearGroup,
      dateOfBirth: orNull(parsed.data.dateOfBirth),
      admissionDate: orNull(parsed.data.admissionDate),
      leavingDate: orNull(parsed.data.leavingDate),
      keyWorkerId,
      ehcpStatus: orNull(parsed.data.ehcpStatus),
      localAuthority: orNull(parsed.data.localAuthority),
      ehcpReviewDue: orNull(parsed.data.ehcpReviewDue),
    })
    .where(eq(child.id, parsedChildId.data))
    .returning({ id: child.id })
  if (updated.length === 0) return notFound("pupil")

  await recordAudit(gate.user, {
    action: "update",
    subject: "pupil",
    subjectId: parsedChildId.data,
    childId: parsedChildId.data,
    summary: `Updated the profile of ${parsed.data.firstName} ${parsed.data.lastName}`,
  })
  return { ok: true }
}

// Leavers are archived, not deleted, so their records are kept.
export async function setPupilArchived(childId: unknown, archived: boolean): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  if (!parsedChildId.success) return notFound("pupil")

  const [pupil] = await getDb()
    .update(child)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(child.id, parsedChildId.data))
    .returning({ firstName: child.firstName, lastName: child.lastName })
  if (!pupil) return notFound("pupil")

  await recordAudit(gate.user, {
    action: "update",
    subject: "pupil",
    subjectId: parsedChildId.data,
    childId: parsedChildId.data,
    summary: `${archived ? "Archived" : "Restored"} ${pupil.firstName} ${pupil.lastName}`,
  })
  return { ok: true }
}

export async function deletePupil(childId: unknown, confirmation: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  if (!parsedChildId.success) return notFound("pupil")

  const db = getDb()
  const [pupil] = await db
    .select({ firstName: child.firstName, lastName: child.lastName, preferredName: child.preferredName })
    .from(child)
    .where(eq(child.id, parsedChildId.data))
  if (!pupil) return notFound("pupil")

  const expected = `${pupil.firstName} ${pupil.lastName}`.toLowerCase()
  if (typeof confirmation !== "string" || confirmation.trim().replace(/\s+/g, " ").toLowerCase() !== expected) {
    return { ok: false, message: "Type the pupil's full name to confirm." }
  }

  const files = await db
    .select({ pathname: recordFile.pathname })
    .from(recordFile)
    .where(eq(recordFile.childId, parsedChildId.data))

  try {
    // Reports, files and contacts are removed by the database (cascade).
    await db.delete(child).where(eq(child.id, parsedChildId.data))
  } catch (error) {
    console.error("[pupils] failed to delete pupil", error)
    return { ok: false, message: "The pupil couldn't be deleted. Please try again." }
  }

  // Best effort. The cleanup job removes anything this misses.
  if (files.length > 0) {
    try {
      await del(files.map((file) => file.pathname))
    } catch (error) {
      console.error("[pupils] couldn't remove a deleted pupil's files", error)
    }
  }

  await recordAudit(gate.user, {
    action: "delete",
    subject: "pupil",
    subjectId: parsedChildId.data,
    childId: parsedChildId.data,
    summary: `Deleted the pupil ${pupilDisplayName(pupil)}`,
  })
  return { ok: true }
}

export async function saveContact(childId: unknown, contactId: unknown, values: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  const parsed = contactSchema.safeParse(values)
  if (!parsedChildId.success) return notFound("pupil")
  if (!parsed.success) return invalidInput(parsed.error)

  const linkedUserId = orNull(parsed.data.linkedUserId)
  if (linkedUserId && (await kindOf(linkedUserId)) !== "parent") {
    return { ok: false, message: "Only a parent login can be linked to a contact.", fieldErrors: { linkedUserId: ["Choose a parent login"] } }
  }

  const fields = {
    name: parsed.data.name,
    relationship: parsed.data.relationship,
    phone: orNull(parsed.data.phone),
    email: orNull(parsed.data.email),
    parentalResponsibility: parsed.data.parentalResponsibility,
    emergencyContact: parsed.data.emergencyContact,
    authorisedToCollect: parsed.data.authorisedToCollect,
    notes: orNull(parsed.data.notes),
    linkedUserId,
  }

  const db = getDb()
  const existingId = contactId ? uuid.safeParse(contactId) : null
  if (contactId && !existingId?.success) return notFound("contact")

  if (existingId?.success) {
    const updated = await db
      .update(pupilContact)
      .set(fields)
      .where(and(eq(pupilContact.id, existingId.data), eq(pupilContact.childId, parsedChildId.data)))
      .returning({ id: pupilContact.id })
    if (updated.length === 0) return notFound("contact")
  } else {
    const [pupil] = await db.select({ id: child.id }).from(child).where(eq(child.id, parsedChildId.data))
    if (!pupil) return notFound("pupil")
    await db.insert(pupilContact).values({ ...fields, childId: parsedChildId.data })
  }

  await recordAudit(gate.user, {
    action: existingId?.success ? "update" : "create",
    subject: "contact",
    subjectId: existingId?.success ? existingId.data : null,
    childId: parsedChildId.data,
    summary: `${existingId?.success ? "Updated" : "Added"} the contact ${parsed.data.name}`,
  })
  return { ok: true }
}

export async function deleteContact(childId: unknown, contactId: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  const parsedContactId = uuid.safeParse(contactId)
  if (!parsedChildId.success || !parsedContactId.success) return notFound("contact")

  const [removed] = await getDb()
    .delete(pupilContact)
    .where(and(eq(pupilContact.id, parsedContactId.data), eq(pupilContact.childId, parsedChildId.data)))
    .returning({ name: pupilContact.name })
  if (!removed) return notFound("contact")

  await recordAudit(gate.user, {
    action: "delete",
    subject: "contact",
    subjectId: parsedContactId.data,
    childId: parsedChildId.data,
    summary: `Removed the contact ${removed.name}`,
  })
  return { ok: true }
}

export async function linkGuardian(childId: unknown, values: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  const parsed = linkGuardianSchema.safeParse(values)
  if (!parsedChildId.success) return notFound("pupil")
  if (!parsed.success) return invalidInput(parsed.error)
  if ((await kindOf(parsed.data.userId)) !== "parent") return { ok: false, message: "Only parent logins can be linked here." }

  await getDb()
    .insert(guardianship)
    .values({ childId: parsedChildId.data, userId: parsed.data.userId, relationship: parsed.data.relationship || null })
    .onConflictDoNothing()

  await recordAudit(gate.user, {
    action: "create",
    subject: "parent_link",
    subjectId: parsed.data.userId,
    childId: parsedChildId.data,
    summary: "Linked a parent login to the pupil",
  })
  return { ok: true }
}

export async function unlinkGuardian(childId: unknown, userId: unknown): Promise<ActionResult> {
  const gate = await getActionUser("pupils.manage")
  if (!gate.ok) return gate

  const parsedChildId = uuid.safeParse(childId)
  const parsedUserId = loginId(userId)
  if (!parsedChildId.success || !parsedUserId) return notFound("link")

  await getDb()
    .delete(guardianship)
    .where(and(eq(guardianship.childId, parsedChildId.data), eq(guardianship.userId, parsedUserId)))

  await recordAudit(gate.user, {
    action: "delete",
    subject: "parent_link",
    subjectId: parsedUserId,
    childId: parsedChildId.data,
    summary: "Removed a parent login's link to the pupil",
  })
  return { ok: true }
}
