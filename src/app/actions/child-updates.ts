"use server"

import { BlobNotFoundError, del, head } from "@vercel/blob"
import { z } from "zod"

import { getDb } from "@/db"
import { childUpdate, childUpdateAttachment } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { childUpdateSchema } from "@/lib/forms/schemas"
import { getChildFor } from "@/lib/portal/children"
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
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Your session has ended. Please log in again." }
  if (user.mustChangePassword) return { ok: false, message: "Please choose your own password first." }
  if (user.role === "parent") return { ok: false, message: "Only staff can add updates." }

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getChildFor(user, parsedChildId.data))) {
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
    return { ok: true }
  } catch (error) {
    console.error("[portal] failed to save child update", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The update couldn't be saved. Please try again." }
  }
}
