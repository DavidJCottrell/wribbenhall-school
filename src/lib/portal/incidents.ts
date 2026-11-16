import "server-only"

import { and, asc, count, desc, eq, isNotNull, ne } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { getDb } from "@/db"
import { child, incident, incidentPupil, recordFile, user as userTable } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"
import { isIncidentStatus, isIncidentType, isInvolvementRole, isSeverity, type IncidentStatus, type IncidentType, type InvolvementRole, type Severity } from "@/lib/incidents/types"

import type { FileView } from "./files"
import { getPupilFor, pupilDisplayName } from "./pupils"

export type IncidentSummary = {
  id: string
  childId: string
  pupilName: string
  occurredOn: string
  occurredTime: string
  type: IncidentType
  severity: Severity
  summary: string
  status: IncidentStatus
  sharedWithParents: boolean
}

export type IncidentDetail = IncidentSummary & {
  location: string | null
  description: string
  antecedent: string | null
  behaviour: string | null
  response: string | null
  outcome: string | null
  injury: string | null
  firstAid: string | null
  interventionTechnique: string | null
  interventionMinutes: number | null
  interventionStaff: string | null
  interventionDebrief: string | null
  parentsInformedOn: string | null
  parentsInformedBy: string | null
  parentsInformedHow: string | null
  createdBy: string | null
  createdByName: string | null
  reviewedByName: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  parentSummary: string | null
  involved: { childId: string; pupilName: string; role: InvolvementRole }[]
  files: FileView[]
}

// What a parent may see: when, what kind, and the words staff chose to share. Nothing else is selected.
export type SharedIncident = {
  id: string
  occurredOn: string
  type: IncidentType
  parentSummary: string
}

export type IncidentFilters = { childId?: string; status?: IncidentStatus; type?: IncidentType; limit?: number }

const subject = alias(child, "subject")

const summaryColumns = {
  id: incident.id,
  childId: incident.childId,
  firstName: subject.firstName,
  lastName: subject.lastName,
  preferredName: subject.preferredName,
  occurredOn: incident.occurredOn,
  occurredTime: incident.occurredTime,
  type: incident.type,
  severity: incident.severity,
  summary: incident.summary,
  status: incident.status,
  shareWithParents: incident.shareWithParents,
}

type SummaryRow = {
  id: string
  childId: string
  firstName: string
  lastName: string
  preferredName: string | null
  occurredOn: string
  occurredTime: string
  type: string
  severity: string
  summary: string
  status: string
  shareWithParents: boolean
}

// Rows that hold a value the code doesn't know (which the database should prevent) are skipped rather than trusted.
function toSummary(row: SummaryRow): IncidentSummary | null {
  if (!isIncidentType(row.type) || !isSeverity(row.severity) || !isIncidentStatus(row.status)) return null
  return {
    id: row.id,
    childId: row.childId,
    pupilName: pupilDisplayName(row),
    occurredOn: row.occurredOn,
    occurredTime: row.occurredTime,
    type: row.type,
    severity: row.severity,
    summary: row.summary,
    status: row.status,
    sharedWithParents: row.shareWithParents,
  }
}

const canViewIncidents = (user: CurrentUser) => can(user, "incidents.view")

export async function listIncidentsFor(user: CurrentUser, { childId, status, type, limit }: IncidentFilters = {}): Promise<IncidentSummary[]> {
  if (!canViewIncidents(user)) return []

  const query = getDb()
    .select(summaryColumns)
    .from(incident)
    .innerJoin(subject, eq(subject.id, incident.childId))
    .where(and(childId ? eq(incident.childId, childId) : undefined, status ? eq(incident.status, status) : undefined, type ? eq(incident.type, type) : undefined))
    .orderBy(desc(incident.occurredOn), desc(incident.occurredTime), desc(incident.createdAt))
  const rows = await (limit ? query.limit(limit) : query)
  return rows.flatMap((row) => toSummary(row) ?? [])
}

export async function getIncidentFor(user: CurrentUser, incidentId: string): Promise<IncidentDetail | null> {
  if (!canViewIncidents(user)) return null

  const db = getDb()
  const author = alias(userTable, "author")
  const reviewer = alias(userTable, "reviewer")
  const [row] = await db
    .select({
      ...summaryColumns,
      location: incident.location,
      description: incident.description,
      antecedent: incident.antecedent,
      behaviour: incident.behaviour,
      response: incident.response,
      outcome: incident.outcome,
      injury: incident.injury,
      firstAid: incident.firstAid,
      interventionTechnique: incident.interventionTechnique,
      interventionMinutes: incident.interventionMinutes,
      interventionStaff: incident.interventionStaff,
      interventionDebrief: incident.interventionDebrief,
      parentsInformedOn: incident.parentsInformedOn,
      parentsInformedBy: incident.parentsInformedBy,
      parentsInformedHow: incident.parentsInformedHow,
      createdBy: incident.createdBy,
      createdByName: author.name,
      reviewedByName: reviewer.name,
      reviewedAt: incident.reviewedAt,
      reviewNotes: incident.reviewNotes,
      parentSummary: incident.parentSummary,
    })
    .from(incident)
    .innerJoin(subject, eq(subject.id, incident.childId))
    .leftJoin(author, eq(author.id, incident.createdBy))
    .leftJoin(reviewer, eq(reviewer.id, incident.reviewedBy))
    .where(eq(incident.id, incidentId))
  if (!row) return null

  const summary = toSummary(row)
  if (!summary) return null

  const [others, files] = await Promise.all([
    db
      .select({ childId: incidentPupil.childId, role: incidentPupil.role, firstName: child.firstName, lastName: child.lastName, preferredName: child.preferredName })
      .from(incidentPupil)
      .innerJoin(child, eq(child.id, incidentPupil.childId))
      .where(eq(incidentPupil.incidentId, incidentId))
      .orderBy(asc(child.lastName), asc(child.firstName)),
    db
      .select({ id: recordFile.id, filename: recordFile.filename, contentType: recordFile.contentType, sizeBytes: recordFile.sizeBytes })
      .from(recordFile)
      .where(eq(recordFile.incidentId, incidentId))
      .orderBy(asc(recordFile.createdAt)),
  ])

  return {
    ...summary,
    location: row.location,
    description: row.description,
    antecedent: row.antecedent,
    behaviour: row.behaviour,
    response: row.response,
    outcome: row.outcome,
    injury: row.injury,
    firstAid: row.firstAid,
    interventionTechnique: row.interventionTechnique,
    interventionMinutes: row.interventionMinutes,
    interventionStaff: row.interventionStaff,
    interventionDebrief: row.interventionDebrief,
    parentsInformedOn: row.parentsInformedOn,
    parentsInformedBy: row.parentsInformedBy,
    parentsInformedHow: row.parentsInformedHow,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    reviewedByName: row.reviewedByName,
    reviewedAt: row.reviewedAt,
    reviewNotes: row.reviewNotes,
    parentSummary: row.parentSummary,
    involved: others.flatMap((other) => (isInvolvementRole(other.role) ? [{ childId: other.childId, pupilName: pupilDisplayName(other), role: other.role }] : [])),
    files,
  }
}

// Parents get this and nothing else. Only the pupil the incident is about, never pupils listed as involved.
export async function listSharedIncidentsFor(user: CurrentUser, childId: string, { limit }: { limit?: number } = {}): Promise<SharedIncident[]> {
  if (user.kind !== "parent" || !(await getPupilFor(user, childId))) return []

  const query = getDb()
    .select({ id: incident.id, occurredOn: incident.occurredOn, type: incident.type, parentSummary: incident.parentSummary })
    .from(incident)
    .where(and(eq(incident.childId, childId), eq(incident.shareWithParents, true), isNotNull(incident.parentSummary)))
    .orderBy(desc(incident.occurredOn), desc(incident.createdAt))
  const rows = await (limit ? query.limit(limit) : query)

  return rows.flatMap((row) => (isIncidentType(row.type) && row.parentSummary?.trim() ? [{ id: row.id, occurredOn: row.occurredOn, type: row.type, parentSummary: row.parentSummary }] : []))
}

export type IncidentCounts = { open: number; underReview: number }

// For the staff home page and a pupil's overview.
export async function countUnclosedIncidents(user: CurrentUser, childId?: string): Promise<IncidentCounts | null> {
  if (!canViewIncidents(user)) return null

  const rows = await getDb()
    .select({ status: incident.status, total: count() })
    .from(incident)
    .where(and(ne(incident.status, "closed"), childId ? eq(incident.childId, childId) : undefined))
    .groupBy(incident.status)

  return {
    open: rows.find((row) => row.status === "open")?.total ?? 0,
    underReview: rows.find((row) => row.status === "under_review")?.total ?? 0,
  }
}
