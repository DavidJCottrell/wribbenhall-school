"use server"

import { BlobNotFoundError, del, head } from "@vercel/blob"
import { and, eq, inArray } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { childUpdate, childUpdateAttachment } from "@/db/schema"
import { recordAudit } from "@/lib/audit"
import { getActionUser, type CurrentUser } from "@/lib/auth/session"
import { childUpdateSchema } from "@/lib/forms/schemas"
import { canManageUpdate } from "@/lib/portal/updates"
import { getPupilFor } from "@/lib/portal/pupils"
import { MAX_ATTACHMENTS_PER_UPDATE, MAX_ATTACHMENT_BYTES, isAllowedAttachmentType, isAttachmentPathFor } from "@/lib/uploads"

const attachmentsSchema = z
  .array(z.object({ pathname: z.string().max(300), filename: z.string().trim().min(1).max(200) }))
  .max(MAX_ATTACHMENTS_PER_UPDATE)

type VerifiedAttachment = { pathname: string; filename: string; contentType: string; sizeBytes: number }

// The browser uploads straight to Blob, so check what actually landed rather than trusting what it says.
async function verifyAttachments(childId: string, attachments: unknown): Promise<VerifiedAttachment[] | null> {
  const parsed = attachmentsSchema.safeParse(attachments ?? [])
  if (!parsed.success) return null

  const verified: VerifiedAttachment[] = []
  for (const { pathname, filename } of parsed.data) {
    if (!isAttachmentPathFor(childId, pathname)) return null
    try {
      const blob = await head(pathname)
      if (blob.size > MAX_ATTACHMENT_BYTES || !isAllowedAttachmentType(blob.contentType)) return null
      verified.push({ pathname, filename, contentType: blob.contentType, sizeBytes: blob.size })
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null
      throw error
    }
  }
  return verified
}

async function discardBlobs(pathnames: string[]) {
  if (pathnames.length === 0) return
  try {
    await del(pathnames)
  } catch (error) {
    console.error("[portal] couldn't remove unused uploads", error)
  }
}

export type AddChildUpdateResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

export async function addChildUpdate(childId: unknown, values: unknown, attachments?: unknown): Promise<AddChildUpdateResult> {
  const gate = await getActionUser("reports.write")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getPupilFor(user, parsedChildId.data))) {
    return { ok: false, message: "That pupil could not be found." }
  }

  const parsed = childUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and save again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  let verified: VerifiedAttachment[] | null
  try {
    verified = await verifyAttachments(parsedChildId.data, attachments)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: "One of the files isn't allowed or didn't finish uploading. Please choose it again." }

  const updateId = crypto.randomUUID()
  const db = getDb()
  const saveUpdate = db
    .insert(childUpdate)
    .values({ ...parsed.data, id: updateId, childId: parsedChildId.data, authorId: user.id })

  try {
    // One batch, so an update is never saved without its files.
    if (verified.length > 0) {
      await db.batch([saveUpdate, db.insert(childUpdateAttachment).values(verified.map((file) => ({ ...file, updateId })))])
    } else {
      await saveUpdate
    }
    await recordAudit(user, { action: "create", subject: "report", subjectId: updateId, childId: parsedChildId.data, summary: "Added a daily report" })
    return { ok: true }
  } catch (error) {
    console.error("[portal] failed to save child update", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The update couldn't be saved. Please try again." }
  }
}

type ManageableUpdate =
  | { ok: true; user: CurrentUser; update: { id: string; childId: string; authorId: string | null } }
  | { ok: false; message: string }

// Finds an update the current user may change, or says why not. Parents never can.
async function manageableUpdate(updateId: unknown): Promise<ManageableUpdate> {
  const gate = await getActionUser("reports.write")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedId = z.uuid().safeParse(updateId)
  if (!parsedId.success) return { ok: false, message: "That update could not be found." }

  const [row] = await getDb()
    .select({ id: childUpdate.id, childId: childUpdate.childId, authorId: childUpdate.authorId })
    .from(childUpdate)
    .where(eq(childUpdate.id, parsedId.data))

  // Same message whether it is missing or not theirs, so ids can't be probed.
  if (!row || !canManageUpdate(user, row) || !(await getPupilFor(user, row.childId))) {
    return { ok: false, message: "That update could not be found." }
  }
  return { ok: true, user, update: row }
}

export async function updateChildUpdate(
  updateId: unknown,
  values: unknown,
  newAttachments?: unknown,
  removedAttachmentIds?: unknown,
): Promise<AddChildUpdateResult> {
  const found = await manageableUpdate(updateId)
  if (!found.ok) return found
  const { update } = found

  const parsed = childUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and save again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const removedIds = z.array(z.uuid()).max(MAX_ATTACHMENTS_PER_UPDATE).safeParse(removedAttachmentIds ?? [])
  if (!removedIds.success) return { ok: false, message: "That change couldn't be saved. Please try again." }

  const db = getDb()
  const existing = await db
    .select({ id: childUpdateAttachment.id, pathname: childUpdateAttachment.pathname })
    .from(childUpdateAttachment)
    .where(eq(childUpdateAttachment.updateId, update.id))
  const removing = existing.filter((file) => removedIds.data.includes(file.id))

  let verified: VerifiedAttachment[] | null
  try {
    verified = await verifyAttachments(update.childId, newAttachments)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: "One of the files isn't allowed or didn't finish uploading. Please choose it again." }

  if (existing.length - removing.length + verified.length > MAX_ATTACHMENTS_PER_UPDATE) {
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: `An update can have up to ${MAX_ATTACHMENTS_PER_UPDATE} files.` }
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.update(childUpdate).set(parsed.data).where(eq(childUpdate.id, update.id)),
  ]
  if (removing.length > 0) {
    statements.push(
      db.delete(childUpdateAttachment).where(
        and(eq(childUpdateAttachment.updateId, update.id), inArray(childUpdateAttachment.id, removing.map((file) => file.id))),
      ),
    )
  }
  if (verified.length > 0) {
    statements.push(db.insert(childUpdateAttachment).values(verified.map((file) => ({ ...file, updateId: update.id }))))
  }

  try {
    await db.batch(statements)
  } catch (error) {
    console.error("[portal] failed to change child update", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The update couldn't be saved. Please try again." }
  }

  await discardBlobs(removing.map((file) => file.pathname))
  await recordAudit(found.user, { action: "update", subject: "report", subjectId: update.id, childId: update.childId, summary: "Edited a daily report" })
  return { ok: true }
}

export async function deleteChildUpdate(updateId: unknown): Promise<AddChildUpdateResult> {
  const found = await manageableUpdate(updateId)
  if (!found.ok) return found

  const db = getDb()
  const files = await db
    .select({ pathname: childUpdateAttachment.pathname })
    .from(childUpdateAttachment)
    .where(eq(childUpdateAttachment.updateId, found.update.id))

  try {
    // Attachment rows go with it (cascade). The files are removed afterwards.
    await db.delete(childUpdate).where(eq(childUpdate.id, found.update.id))
  } catch (error) {
    console.error("[portal] failed to delete child update", error)
    return { ok: false, message: "The update couldn't be deleted. Please try again." }
  }

  await discardBlobs(files.map((file) => file.pathname))
  await recordAudit(found.user, { action: "delete", subject: "report", subjectId: found.update.id, childId: found.update.childId, summary: "Deleted a daily report" })
  return { ok: true }
}
