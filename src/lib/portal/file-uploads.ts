import "server-only"

import { BlobNotFoundError, del, head } from "@vercel/blob"
import { z } from "zod"

import { MAX_ATTACHMENT_BYTES, MAX_FILES_PER_RECORD, isAllowedAttachmentType, isAttachmentPathFor } from "@/lib/uploads"

const uploadsSchema = z
  .array(z.object({ pathname: z.string().max(300), filename: z.string().trim().min(1).max(200) }))
  .max(MAX_FILES_PER_RECORD)

export type VerifiedUpload = { pathname: string; filename: string; contentType: string; sizeBytes: number }

// The browser uploads straight to Blob, so check what actually landed rather than trusting what it says.
export async function verifyUploads(childId: string, uploads: unknown): Promise<VerifiedUpload[] | null> {
  const parsed = uploadsSchema.safeParse(uploads ?? [])
  if (!parsed.success) return null

  const verified: VerifiedUpload[] = []
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

export async function discardBlobs(pathnames: string[]) {
  if (pathnames.length === 0) return
  try {
    await del(pathnames)
  } catch (error) {
    console.error("[portal] couldn't remove unused uploads", error)
  }
}
