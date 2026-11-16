import "server-only"

import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm"
import { format, parseISO, subDays } from "date-fns"

import { getDb } from "@/db"
import { dayReport, recordFile, user as userTable } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

import { getDayAttendanceFor, type DayAttendance } from "./attendance"
import type { FileView } from "./files"
import { getPupilFor } from "./pupils"

export type DayReportView = {
  id: string
  title: string
  body: string
  reportDate: string
  session: string | null
  subject: string | null
  visibleToParents: boolean
  authorId: string | null
  authorName: string | null
  files: FileView[]
}

// Staff can change their own reports. Anyone who manages reports can change any.
export function canManageDayReport(user: CurrentUser, report: { authorId: string | null }) {
  if (can(user, "reports.manage")) return true
  return can(user, "reports.write") && report.authorId === user.id
}

type ListOptions = { limit?: number; from?: string; to?: string }

// Every member of staff can read reports. Parents only get the ones marked for them.
export async function listDayReportsFor(user: CurrentUser, childId: string, { limit, from, to }: ListOptions = {}): Promise<DayReportView[]> {
  if (!(await getPupilFor(user, childId))) return []

  const db = getDb()
  const query = db
    .select({
      id: dayReport.id,
      title: dayReport.title,
      body: dayReport.body,
      reportDate: dayReport.reportDate,
      session: dayReport.session,
      subject: dayReport.subject,
      visibleToParents: dayReport.visibleToParents,
      authorId: dayReport.authorId,
      authorName: userTable.name,
    })
    .from(dayReport)
    .leftJoin(userTable, eq(userTable.id, dayReport.authorId))
    .where(
      and(
        eq(dayReport.childId, childId),
        user.kind === "parent" ? eq(dayReport.visibleToParents, true) : undefined,
        from ? gte(dayReport.reportDate, from) : undefined,
        to ? lte(dayReport.reportDate, to) : undefined,
      ),
    )
    .orderBy(desc(dayReport.reportDate), desc(dayReport.createdAt))
  const reports = await (limit ? query.limit(limit) : query)

  if (reports.length === 0) return []

  const files = await db
    .select({
      id: recordFile.id,
      dayReportId: recordFile.dayReportId,
      filename: recordFile.filename,
      contentType: recordFile.contentType,
      sizeBytes: recordFile.sizeBytes,
    })
    .from(recordFile)
    .where(inArray(recordFile.dayReportId, reports.map((report) => report.id)))
    .orderBy(asc(recordFile.createdAt))

  return reports.map((report) => ({
    ...report,
    files: files.filter((file) => file.dayReportId === report.id),
  }))
}

export type SchoolDay = {
  date: string
  attendance: DayAttendance | null
  reports: DayReportView[]
}

export type DayByDayView = {
  days: SchoolDay[]
  from: string
  to: string
  // Date to pass as the next window's end, or null when nothing earlier exists.
  earlierEnd: string | null
}

const WINDOW_DAYS = 14

// Days that have a report or an attendance mark, newest first. A window of calendar days ending on `to`.
export async function getDayByDayFor(user: CurrentUser, childId: string, to: string): Promise<DayByDayView | null> {
  if (!(await getPupilFor(user, childId))) return null

  const from = format(subDays(parseISO(to), WINDOW_DAYS - 1), "yyyy-MM-dd")
  const [reports, attendance, [earlier]] = await Promise.all([
    listDayReportsFor(user, childId, { from, to }),
    getDayAttendanceFor(user, childId, from, to),
    getDb()
      .select({ date: dayReport.reportDate })
      .from(dayReport)
      .where(
        and(
          eq(dayReport.childId, childId),
          user.kind === "parent" ? eq(dayReport.visibleToParents, true) : undefined,
          lt(dayReport.reportDate, from),
        ),
      )
      .orderBy(desc(dayReport.reportDate))
      .limit(1),
  ])

  const dates = new Set([...attendance.keys(), ...reports.map((report) => report.reportDate)])
  const days = [...dates]
    .sort()
    .reverse()
    .map((date) => ({
      date,
      attendance: attendance.get(date) ?? null,
      reports: reports.filter((report) => report.reportDate === date),
    }))

  return { days, from, to, earlierEnd: earlier ? earlier.date : null }
}
