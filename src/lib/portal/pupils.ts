import "server-only"

import { and, asc, eq, isNull } from "drizzle-orm"

import { getDb } from "@/db"
import { child, guardianship, pupilContact, user as userTable } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

export type PupilSummary = {
  id: string
  firstName: string
  lastName: string
  preferredName: string | null
  yearGroup: string
}

export type PupilProfile = PupilSummary & {
  dateOfBirth: string | null
  admissionDate: string | null
  leavingDate: string | null
  keyWorkerId: string | null
  keyWorkerName: string | null
  ehcpStatus: string | null
  localAuthority: string | null
  ehcpReviewDue: string | null
  archived: boolean
}

// What a parent may see about their own child. No other staff or school-internal fields.
export type ParentPupilView = PupilSummary & {
  dateOfBirth: string | null
  keyWorkerName: string | null
  ehcpReviewDue: string | null
}

export const pupilDisplayName = (pupil: Pick<PupilSummary, "firstName" | "lastName" | "preferredName">) =>
  `${pupil.preferredName?.trim() || pupil.firstName} ${pupil.lastName}`

const summaryColumns = {
  id: child.id,
  firstName: child.firstName,
  lastName: child.lastName,
  preferredName: child.preferredName,
  yearGroup: child.yearGroup,
}

const byName = [asc(child.lastName), asc(child.firstName)]

// The single place that decides which pupils a user may see.
// Staff see every current pupil. Parents see only the pupils linked to their login.
// Archived pupils (leavers) appear only for people who manage pupils, and only when asked for.
export async function listPupilsFor(user: CurrentUser, { includeArchived = false }: { includeArchived?: boolean } = {}): Promise<PupilSummary[]> {
  const db = getDb()
  const showArchived = includeArchived && can(user, "pupils.manage")
  const current = showArchived ? undefined : isNull(child.archivedAt)

  if (user.kind === "staff") {
    return db.select(summaryColumns).from(child).where(current).orderBy(...byName)
  }

  return db
    .select(summaryColumns)
    .from(child)
    .innerJoin(guardianship, eq(guardianship.childId, child.id))
    .where(and(eq(guardianship.userId, user.id), isNull(child.archivedAt)))
    .orderBy(...byName)
}

// Null for a pupil the user may not see, so callers can't tell "missing" from "forbidden".
export async function getPupilFor(user: CurrentUser, pupilId: string, options: { includeArchived?: boolean } = {}): Promise<PupilSummary | null> {
  const pupils = await listPupilsFor(user, options)
  return pupils.find((candidate) => candidate.id === pupilId) ?? null
}

// Staff only. Parents get getParentPupilView.
export async function getPupilProfile(user: CurrentUser, pupilId: string): Promise<PupilProfile | null> {
  if (user.kind !== "staff") return null
  if (!(await getPupilFor(user, pupilId, { includeArchived: true }))) return null

  const [row] = await getDb()
    .select({
      ...summaryColumns,
      dateOfBirth: child.dateOfBirth,
      admissionDate: child.admissionDate,
      leavingDate: child.leavingDate,
      keyWorkerId: child.keyWorkerId,
      keyWorkerName: userTable.name,
      ehcpStatus: child.ehcpStatus,
      localAuthority: child.localAuthority,
      ehcpReviewDue: child.ehcpReviewDue,
      archivedAt: child.archivedAt,
    })
    .from(child)
    .leftJoin(userTable, eq(userTable.id, child.keyWorkerId))
    .where(eq(child.id, pupilId))
  if (!row) return null

  const { archivedAt, ...rest } = row
  return { ...rest, archived: archivedAt !== null }
}

export async function getParentPupilView(user: CurrentUser, pupilId: string): Promise<ParentPupilView | null> {
  if (user.kind !== "parent") return null
  if (!(await getPupilFor(user, pupilId))) return null

  const [row] = await getDb()
    .select({
      ...summaryColumns,
      dateOfBirth: child.dateOfBirth,
      keyWorkerName: userTable.name,
      ehcpReviewDue: child.ehcpReviewDue,
    })
    .from(child)
    .leftJoin(userTable, eq(userTable.id, child.keyWorkerId))
    .where(eq(child.id, pupilId))
  return row ?? null
}

export type ContactView = {
  id: string
  name: string
  relationship: string
  phone: string | null
  email: string | null
  parentalResponsibility: boolean
  emergencyContact: boolean
  authorisedToCollect: boolean
  notes: string | null
}

const contactColumns = {
  id: pupilContact.id,
  name: pupilContact.name,
  relationship: pupilContact.relationship,
  phone: pupilContact.phone,
  email: pupilContact.email,
  parentalResponsibility: pupilContact.parentalResponsibility,
  emergencyContact: pupilContact.emergencyContact,
  authorisedToCollect: pupilContact.authorisedToCollect,
  notes: pupilContact.notes,
}

// Staff see every contact. A parent sees only the entries linked to their own login.
export async function listContactsFor(user: CurrentUser, pupilId: string): Promise<ContactView[]> {
  if (!(await getPupilFor(user, pupilId))) return []

  const db = getDb()
  const ownEntries = user.kind === "parent" ? eq(pupilContact.linkedUserId, user.id) : undefined

  const rows = await db
    .select(contactColumns)
    .from(pupilContact)
    .where(and(eq(pupilContact.childId, pupilId), ownEntries))
    .orderBy(asc(pupilContact.name))

  // Internal notes are for staff. A parent doesn't get them.
  return user.kind === "parent" ? rows.map((row) => ({ ...row, notes: null })) : rows
}
