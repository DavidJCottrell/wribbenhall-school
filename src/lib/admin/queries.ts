import "server-only"

import { and, asc, count, eq, notInArray } from "drizzle-orm"

import { getDb } from "@/db"
import { child, guardianship, staffAssignment, user as userTable } from "@/db/schema"
import { isUserRole, type UserRole } from "@/lib/auth/roles"
import type { CurrentUser } from "@/lib/auth/session"
import type { ChildSummary } from "@/lib/portal/children"

// These queries expose everyone's details, so each one re-checks the caller.
function assertAdmin(user: CurrentUser) {
  if (user.role !== "admin") throw new Error("Administrator access required")
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: UserRole
  banned: boolean
}

export type PersonOption = { id: string; name: string; email: string }

export async function listUsers(admin: CurrentUser): Promise<AdminUser[]> {
  assertAdmin(admin)

  const rows = await getDb()
    .select({ id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role, banned: userTable.banned })
    .from(userTable)
    .orderBy(asc(userTable.name))

  return rows.flatMap(({ role, ...rest }) => (isUserRole(role) ? [{ ...rest, role }] : []))
}

export type PupilWithCounts = ChildSummary & { guardianCount: number; staffCount: number }

export async function listPupilsWithCounts(admin: CurrentUser): Promise<PupilWithCounts[]> {
  assertAdmin(admin)
  const db = getDb()

  const [pupils, guardianCounts, staffCounts] = await Promise.all([
    db
      .select({ id: child.id, firstName: child.firstName, lastName: child.lastName, yearGroup: child.yearGroup })
      .from(child)
      .orderBy(asc(child.lastName), asc(child.firstName)),
    db.select({ childId: guardianship.childId, total: count() }).from(guardianship).groupBy(guardianship.childId),
    db.select({ childId: staffAssignment.childId, total: count() }).from(staffAssignment).groupBy(staffAssignment.childId),
  ])

  const guardiansByChild = new Map(guardianCounts.map((row) => [row.childId, row.total]))
  const staffByChild = new Map(staffCounts.map((row) => [row.childId, row.total]))

  return pupils.map((pupil) => ({
    ...pupil,
    guardianCount: guardiansByChild.get(pupil.id) ?? 0,
    staffCount: staffByChild.get(pupil.id) ?? 0,
  }))
}

export type PupilAdminDetail = {
  pupil: ChildSummary
  guardians: (PersonOption & { relationship: string | null })[]
  staff: PersonOption[]
  availableParents: PersonOption[]
  availableStaff: PersonOption[]
}

export async function getPupilAdminDetail(admin: CurrentUser, childId: string): Promise<PupilAdminDetail | null> {
  assertAdmin(admin)
  const db = getDb()

  const [pupil] = await db
    .select({ id: child.id, firstName: child.firstName, lastName: child.lastName, yearGroup: child.yearGroup })
    .from(child)
    .where(eq(child.id, childId))
  if (!pupil) return null

  const person = { id: userTable.id, name: userTable.name, email: userTable.email }

  const [guardians, staff] = await Promise.all([
    db
      .select({ ...person, relationship: guardianship.relationship })
      .from(guardianship)
      .innerJoin(userTable, eq(userTable.id, guardianship.userId))
      .where(eq(guardianship.childId, childId))
      .orderBy(asc(userTable.name)),
    db
      .select(person)
      .from(staffAssignment)
      .innerJoin(userTable, eq(userTable.id, staffAssignment.userId))
      .where(eq(staffAssignment.childId, childId))
      .orderBy(asc(userTable.name)),
  ])

  const availablePeople = (role: UserRole, linked: PersonOption[]) =>
    db
      .select(person)
      .from(userTable)
      .where(
        linked.length > 0
          ? and(eq(userTable.role, role), eq(userTable.banned, false), notInArray(userTable.id, linked.map((linkedPerson) => linkedPerson.id)))
          : and(eq(userTable.role, role), eq(userTable.banned, false)),
      )
      .orderBy(asc(userTable.name))

  const [availableParents, availableStaff] = await Promise.all([
    availablePeople("parent", guardians),
    availablePeople("staff", staff),
  ])

  return { pupil, guardians, staff, availableParents, availableStaff }
}
