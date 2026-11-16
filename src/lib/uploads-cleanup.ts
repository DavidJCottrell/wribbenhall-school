import "server-only"

import { del, list } from "@vercel/blob"
import { inArray } from "drizzle-orm"

import { getDb } from "@/db"
import { childUpdateAttachment } from "@/db/schema"

// Files newer than this may still belong to an update someone is in the middle of saving.
const DEFAULT_GRACE_MS = 24 * 60 * 60 * 1000
const LIST_PAGE_SIZE = 1000
const DELETE_BATCH_SIZE = 100
// Keeps one run well inside a function's time limit. The rest is picked up tomorrow.
const MAX_DELETIONS_PER_RUN = 500

export type CleanupResult = {
  dryRun: boolean
  scanned: number
  tooNewToJudge: number
  orphaned: number
  deleted: number
}

// Browsers upload straight to Blob before the update is saved, so abandoned forms leave files behind.
// An uploaded file is an orphan if no attachment row points at it.
export async function removeOrphanedUploads({
  dryRun = false,
  graceMs = DEFAULT_GRACE_MS,
  now = new Date(),
}: { dryRun?: boolean; graceMs?: number; now?: Date } = {}): Promise<CleanupResult> {
  const db = getDb()
  const orphans: string[] = []
  let scanned = 0
  let tooNewToJudge = 0
  let cursor: string | undefined

  do {
    const page = await list({ prefix: "children/", cursor, limit: LIST_PAGE_SIZE })
    scanned += page.blobs.length

    const old = page.blobs.filter((blob) => now.getTime() - blob.uploadedAt.getTime() >= graceMs)
    tooNewToJudge += page.blobs.length - old.length

    if (old.length > 0) {
      const rows = await db
        .select({ pathname: childUpdateAttachment.pathname })
        .from(childUpdateAttachment)
        .where(inArray(childUpdateAttachment.pathname, old.map((blob) => blob.pathname)))
      const referenced = new Set(rows.map((row) => row.pathname))
      for (const blob of old) if (!referenced.has(blob.pathname)) orphans.push(blob.pathname)
    }

    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor && orphans.length < MAX_DELETIONS_PER_RUN)

  const toDelete = orphans.slice(0, MAX_DELETIONS_PER_RUN)
  if (!dryRun) {
    for (let start = 0; start < toDelete.length; start += DELETE_BATCH_SIZE) {
      await del(toDelete.slice(start, start + DELETE_BATCH_SIZE))
    }
  }

  return { dryRun, scanned, tooNewToJudge, orphaned: orphans.length, deleted: dryRun ? 0 : toDelete.length }
}
