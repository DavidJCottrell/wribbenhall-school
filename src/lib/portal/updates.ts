import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/db"
import { childUpdate, childUpdateAttachment, user as userTable } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

import { getPupilFor } from "./pupils"

export type AttachmentView = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
}

export type ChildUpdateView = {
  id: string
  title: string
  body: string
  occurredOn: string
  visibleToParents: boolean
  authorId: string | null
  authorName: string | null
  attachments: AttachmentView[]
}

// Staff can change their own reports. Anyone who manages reports can change any.
export function canManageUpdate(user: CurrentUser, update: { authorId: string | null }) {
  if (can(user, "reports.manage")) return true
  return can(user, "reports.write") && update.authorId === user.id
}

// Every member of staff can read reports. Parents only get the ones marked for them.
export async function listUpdatesFor(user: CurrentUser, childId: string, { limit }: { limit?: number } = {}): Promise<ChildUpdateView[]> {
  if (!(await getPupilFor(user, childId))) return []

  const visibility = user.kind === "parent" ? eq(childUpdate.visibleToParents, true) : undefined

  const db = getDb()
  const query = db
    .select({
      id: childUpdate.id,
      title: childUpdate.title,
      body: childUpdate.body,
      occurredOn: childUpdate.occurredOn,
      visibleToParents: childUpdate.visibleToParents,
      authorId: childUpdate.authorId,
      authorName: userTable.name,
    })
    .from(childUpdate)
    .leftJoin(userTable, eq(userTable.id, childUpdate.authorId))
    .where(and(eq(childUpdate.childId, childId), visibility))
    .orderBy(desc(childUpdate.occurredOn), desc(childUpdate.createdAt))
  const updates = await (limit ? query.limit(limit) : query)

  if (updates.length === 0) return []

  const attachments = await db
    .select({
      id: childUpdateAttachment.id,
      updateId: childUpdateAttachment.updateId,
      filename: childUpdateAttachment.filename,
      contentType: childUpdateAttachment.contentType,
      sizeBytes: childUpdateAttachment.sizeBytes,
    })
    .from(childUpdateAttachment)
    .where(inArray(childUpdateAttachment.updateId, updates.map((update) => update.id)))
    .orderBy(asc(childUpdateAttachment.createdAt))

  return updates.map((update) => ({
    ...update,
    attachments: attachments.filter((attachment) => attachment.updateId === update.id),
  }))
}

export type AttachmentFile = AttachmentView & { pathname: string }

// Same rules as the report list: the pupil must be visible to the user, and parents only get parent-visible reports.
export async function getAttachmentFor(user: CurrentUser, attachmentId: string): Promise<AttachmentFile | null> {
  const [row] = await getDb()
    .select({
      id: childUpdateAttachment.id,
      pathname: childUpdateAttachment.pathname,
      filename: childUpdateAttachment.filename,
      contentType: childUpdateAttachment.contentType,
      sizeBytes: childUpdateAttachment.sizeBytes,
      childId: childUpdate.childId,
      visibleToParents: childUpdate.visibleToParents,
    })
    .from(childUpdateAttachment)
    .innerJoin(childUpdate, eq(childUpdate.id, childUpdateAttachment.updateId))
    .where(eq(childUpdateAttachment.id, attachmentId))
  if (!row) return null

  if (user.kind === "parent" && !row.visibleToParents) return null
  if (!(await getPupilFor(user, row.childId))) return null

  return {
    id: row.id,
    pathname: row.pathname,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  }
}
