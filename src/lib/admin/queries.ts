import "server-only"

import { and, asc, count, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { child, childUpdate, guardianship, user as userTable } from "@/db/schema"
import { can, isUserKind, normalizePermissions, type Permission, type UserKind } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"
import { listContactsFor, getPupilProfile, type ContactView, type PupilProfile, type PupilSummary } from "@/lib/portal/pupils"

// These queries expose everyone's details, so each one re-checks the caller.
function assertCan(user: CurrentUser, permission: Permission) {
  if (!can(user, permission)) throw new Error("Not allowed")
}

export type AdminUser = {
  id: string
  name: string
  email: string
  kind: UserKind
  permissions: Permission[]
  banned: boolean
}

export type PersonOption = { id: string; name: string; email: string }

export async function listUsers(user: CurrentUser): Promise<AdminUser[]> {
  assertCan(user, "users.manage")

  const rows = await getDb()
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      permissions: userTable.permissions,
      banned: userTable.banned,
    })
    .from(userTable)
    .orderBy(asc(userTable.name))

  return rows.flatMap(({ role, permissions, ...rest }) =>
    isUserKind(role) ? [{ ...rest, kind: role, permissions: role === "staff" ? normalizePermissions(permissions) : [] }] : [],
  )
}

export type PupilWithCounts = PupilSummary & { guardianCount: number; archived: boolean }

export async function listPupilsForAdmin(user: CurrentUser): Promise<PupilWithCounts[]> {
  assertCan(user, "pupils.manage")
  const db = getDb()

  const [pupils, guardianCounts] = await Promise.all([
    db
      .select({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        preferredName: child.preferredName,
        yearGroup: child.yearGroup,
        archivedAt: child.archivedAt,
      })
      .from(child)
      .orderBy(asc(child.lastName), asc(child.firstName)),
    db.select({ childId: guardianship.childId, total: count() }).from(guardianship).groupBy(guardianship.childId),
  ])

  const guardiansByChild = new Map(guardianCounts.map((row) => [row.childId, row.total]))
  return pupils.map(({ archivedAt, ...pupil }) => ({
    ...pupil,
    archived: archivedAt !== null,
    guardianCount: guardiansByChild.get(pupil.id) ?? 0,
  }))
}

export type PupilAdminDetail = {
  pupil: PupilProfile
  contacts: ContactView[]
  guardians: (PersonOption & { relationship: string | null })[]
  availableParents: PersonOption[]
  staffOptions: PersonOption[]
  parentOptions: PersonOption[]
  updateCount: number
}

export async function getPupilAdminDetail(user: CurrentUser, childId: string): Promise<PupilAdminDetail | null> {
  assertCan(user, "pupils.manage")
  const db = getDb()

  const pupil = await getPupilProfile(user, childId)
  if (!pupil) return null

  const person = { id: userTable.id, name: userTable.name, email: userTable.email }

  const [[updates], guardians, staffOptions, parentOptions, contacts] = await Promise.all([
    db.select({ total: count() }).from(childUpdate).where(eq(childUpdate.childId, childId)),
    db
      .select({ ...person, relationship: guardianship.relationship })
      .from(guardianship)
      .innerJoin(userTable, eq(userTable.id, guardianship.userId))
      .where(eq(guardianship.childId, childId))
      .orderBy(asc(userTable.name)),
    db.select(person).from(userTable).where(and(eq(userTable.role, "staff"), eq(userTable.banned, false))).orderBy(asc(userTable.name)),
    db.select(person).from(userTable).where(and(eq(userTable.role, "parent"), eq(userTable.banned, false))).orderBy(asc(userTable.name)),
    listContactsFor(user, childId),
  ])

  const linkedIds = guardians.map((guardian) => guardian.id)
  const availableParents = linkedIds.length > 0 ? parentOptions.filter((parent) => !linkedIds.includes(parent.id)) : parentOptions

  return { pupil, contacts, guardians, availableParents, staffOptions, parentOptions, updateCount: updates?.total ?? 0 }
}
