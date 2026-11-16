import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { child, childUpdate, guardianship, staffAssignment, user as userTable } from "@/db/schema"
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

export type ChildUpdateView = {
  id: string
  title: string
  body: string
  occurredOn: string
  visibleToParents: boolean
  authorName: string
}

export async function listUpdatesFor(user: CurrentUser, childId: string): Promise<ChildUpdateView[]> {
  if (!(await getChildFor(user, childId))) return []

  const visibility = user.role === "parent" ? eq(childUpdate.visibleToParents, true) : undefined

  return getDb()
    .select({
      id: childUpdate.id,
      title: childUpdate.title,
      body: childUpdate.body,
      occurredOn: childUpdate.occurredOn,
      visibleToParents: childUpdate.visibleToParents,
      authorName: userTable.name,
    })
    .from(childUpdate)
    .innerJoin(userTable, eq(userTable.id, childUpdate.authorId))
    .where(and(eq(childUpdate.childId, childId), visibility))
    .orderBy(desc(childUpdate.occurredOn), desc(childUpdate.createdAt))
}
