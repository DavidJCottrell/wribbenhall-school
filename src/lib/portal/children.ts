import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/db"
import { child, childUpdate, childUpdateAttachment, guardianship, staffAssignment, user as userTable } from "@/db/schema"
import type { CurrentUser } from "@/lib/auth/session"

export type ChildSummary = {
  id: string
  firstName: string
  lastName: string
  yearGroup: string
}

const childColumns = {
  id: child.id,
  firstName: child.firstName,
  lastName: child.lastName,
  yearGroup: child.yearGroup,
}

const byName = [asc(child.lastName), asc(child.firstName)]

// The single place that decides which children a user may see.
export async function listChildrenFor(user: CurrentUser): Promise<ChildSummary[]> {
  const db = getDb()

  switch (user.role) {
    case "admin":
      return db.select(childColumns).from(child).orderBy(...byName)
    case "staff":
      return db
        .select(childColumns)
        .from(child)
        .innerJoin(staffAssignment, eq(staffAssignment.childId, child.id))
        .where(eq(staffAssignment.userId, user.id))
        .orderBy(...byName)
    case "parent":
      return db
        .select(childColumns)
        .from(child)
        .innerJoin(guardianship, eq(guardianship.childId, child.id))
        .where(eq(guardianship.userId, user.id))
        .orderBy(...byName)
  }
}

// Returns null for a child the user may not see, so callers can't tell "missing" from "forbidden".
export async function getChildFor(user: CurrentUser, childId: string): Promise<ChildSummary | null> {
  const children = await listChildrenFor(user)
  return children.find((candidate) => candidate.id === childId) ?? null
}

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

// Staff can change their own updates. Administrators can change any.
export function canManageUpdate(user: CurrentUser, update: { authorId: string | null }) {
  if (user.role === "admin") return true
  return user.role === "staff" && update.authorId === user.id
}

export async function listUpdatesFor(user: CurrentUser, childId: string): Promise<ChildUpdateView[]> {
  if (!(await getChildFor(user, childId))) return []

  const visibility = user.role === "parent" ? eq(childUpdate.visibleToParents, true) : undefined

  const db = getDb()
  const updates = await db
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

// Same rules as the update list: the child must be visible to the user, and parents only get parent-visible updates.
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

  if (user.role === "parent" && !row.visibleToParents) return null
  if (!(await getChildFor(user, row.childId))) return null

  return {
    id: row.id,
    pathname: row.pathname,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  }
}
