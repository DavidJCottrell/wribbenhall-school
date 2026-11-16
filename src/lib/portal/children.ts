import "server-only"

import { asc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { child, guardianship, staffAssignment } from "@/db/schema"
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
