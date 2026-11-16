import "server-only"

import { and, desc, eq, gte, lte } from "drizzle-orm"
import { after } from "next/server"

import { getDb } from "@/db"
import { auditEvent } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

export type AuditAction = "view" | "create" | "update" | "delete" | "export"

export type AuditSubject = "attendance" | "pupil" | "contact" | "parent_link" | "login" | "permissions" | "report" | "incident" | "password"

export type AuditEntry = {
  action: AuditAction
  subject: AuditSubject
  subjectId?: string | null
  // The pupil this is about, if any, so the log can be filtered by pupil.
  childId?: string | null
  // Short and free of sensitive detail. Say what happened, not what the record contains.
  summary: string
}

type Actor = Pick<CurrentUser, "id" | "name">

export async function recordAudit(actor: Actor, entry: AuditEntry): Promise<void> {
  try {
    await getDb()
      .insert(auditEvent)
      .values({
        userId: actor.id,
        userName: actor.name,
        action: entry.action,
        subject: entry.subject,
        subjectId: entry.subjectId ?? null,
        childId: entry.childId ?? null,
        summary: entry.summary,
      })
  } catch (error) {
    // A logging fault must not stop someone doing their job, but it must be noticed.
    console.error("[audit] could not record event", error)
  }
}

// For page views. Runs once, after the response is sent, however many times React renders.
export function recordAuditAfterResponse(actor: Actor, entry: AuditEntry) {
  after(() => recordAudit(actor, entry))
}

export type AuditFilters = {
  childId?: string
  userId?: string
  from?: Date
  to?: Date
  limit?: number
}

export type AuditRow = {
  id: string
  at: Date
  userName: string
  action: string
  subject: string
  childId: string | null
  summary: string
}

const DEFAULT_LIMIT = 200

export async function listAuditEvents(user: CurrentUser, filters: AuditFilters = {}): Promise<AuditRow[]> {
  if (!can(user, "audit.view")) return []

  const conditions = [
    filters.childId ? eq(auditEvent.childId, filters.childId) : undefined,
    filters.userId ? eq(auditEvent.userId, filters.userId) : undefined,
    filters.from ? gte(auditEvent.at, filters.from) : undefined,
    filters.to ? lte(auditEvent.at, filters.to) : undefined,
  ]

  return getDb()
    .select({
      id: auditEvent.id,
      at: auditEvent.at,
      userName: auditEvent.userName,
      action: auditEvent.action,
      subject: auditEvent.subject,
      childId: auditEvent.childId,
      summary: auditEvent.summary,
    })
    .from(auditEvent)
    .where(and(...conditions))
    .orderBy(desc(auditEvent.at))
    .limit(filters.limit ?? DEFAULT_LIMIT)
}
