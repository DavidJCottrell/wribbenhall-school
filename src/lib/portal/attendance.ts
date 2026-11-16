import "server-only"

import { and, asc, eq, gte, lte } from "drizzle-orm"
import { format, parseISO, subDays } from "date-fns"

import { getDb } from "@/db"
import { attendanceMark, user as userTable } from "@/db/schema"
import { isAttendanceCode, isAttendanceSession, type AttendanceCode, type AttendanceMark } from "@/lib/attendance/codes"
import {
  absenceReasons,
  dayStrip,
  isPersistentAbsence,
  schoolYearStart,
  summarise,
  weeklyBreakdown,
  type AbsenceReason,
  type AttendanceSummary,
  type DayEntry,
  type WeekSummary,
} from "@/lib/attendance/stats"
import type { CurrentUser } from "@/lib/auth/session"

import { getPupilFor, listPupilsFor, pupilDisplayName } from "./pupils"

const WEEKS_SHOWN = 12
const STRIP_WEEKDAYS = 30
const RECENT_DAYS = 28
const TABLE_WEEKDAYS = 15

const iso = (date: Date) => format(date, "yyyy-MM-dd")

type StoredMark = AttendanceMark & { note: string | null; recordedByName: string | null }

// Rows that don't hold a valid code or session (which the database should prevent) are skipped rather than trusted.
function toMark(row: { markDate: string; session: string; code: string; note: string | null; recordedByName: string | null }): StoredMark | null {
  if (!isAttendanceCode(row.code) || !isAttendanceSession(row.session)) return null
  return { date: row.markDate, session: row.session, code: row.code, note: row.note, recordedByName: row.recordedByName }
}

async function loadMarks(pupilId: string, from: string, to: string): Promise<StoredMark[]> {
  const rows = await getDb()
    .select({
      markDate: attendanceMark.markDate,
      session: attendanceMark.session,
      code: attendanceMark.code,
      note: attendanceMark.note,
      recordedByName: userTable.name,
    })
    .from(attendanceMark)
    .leftJoin(userTable, eq(userTable.id, attendanceMark.recordedBy))
    .where(and(eq(attendanceMark.childId, pupilId), gte(attendanceMark.markDate, from), lte(attendanceMark.markDate, to)))
    .orderBy(asc(attendanceMark.markDate))
  return rows.flatMap((row) => toMark(row) ?? [])
}

export type AttendanceDayRow = {
  date: string
  am: AttendanceCode | null
  pm: AttendanceCode | null
  // Staff only. A parent never receives notes.
  note: string | null
}

export type AttendanceView = {
  today: string
  year: AttendanceSummary
  recent: AttendanceSummary
  persistentAbsence: boolean
  weeks: WeekSummary[]
  strip: DayEntry[]
  reasons: AbsenceReason[]
  recentDays: AttendanceDayRow[]
}

// One pupil's attendance. Parents get this for their own children only, without staff notes.
export async function getAttendanceFor(user: CurrentUser, pupilId: string, today: string): Promise<AttendanceView | null> {
  if (!(await getPupilFor(user, pupilId))) return null

  const yearStart = schoolYearStart(today)
  const chartStart = iso(subDays(parseISO(today), WEEKS_SHOWN * 7))
  const marks = await loadMarks(pupilId, yearStart < chartStart ? yearStart : chartStart, today)

  const yearMarks = marks.filter((mark) => mark.date >= yearStart)
  const recentStart = iso(subDays(parseISO(today), RECENT_DAYS - 1))
  const year = summarise(yearMarks)

  const strip = dayStrip(marks, { weekdays: STRIP_WEEKDAYS, today })
  const notes = new Map<string, string>()
  if (user.kind === "staff") for (const mark of marks) if (mark.note && !notes.has(mark.date)) notes.set(mark.date, mark.note)

  const recentDays = strip
    .slice(-TABLE_WEEKDAYS)
    .reverse()
    .map((day) => ({ date: day.date, am: day.am, pm: day.pm, note: notes.get(day.date) ?? null }))

  return {
    today,
    year,
    recent: summarise(marks.filter((mark) => mark.date >= recentStart)),
    persistentAbsence: isPersistentAbsence(year.percentage),
    weeks: weeklyBreakdown(marks, { weeks: WEEKS_SHOWN, today }),
    strip,
    reasons: absenceReasons(yearMarks),
    recentDays,
  }
}

export type RegisterEntry = { code: AttendanceCode; note: string | null }

export type RegisterRow = {
  pupilId: string
  pupilName: string
  am: RegisterEntry | null
  pm: RegisterEntry | null
}

// The whole register for a day. Every member of staff can read it. Only people who may record can change it.
export async function getRegister(user: CurrentUser, date: string): Promise<RegisterRow[]> {
  if (user.kind !== "staff") return []

  const pupils = await listPupilsFor(user)
  const rows = await getDb()
    .select({ childId: attendanceMark.childId, session: attendanceMark.session, code: attendanceMark.code, note: attendanceMark.note })
    .from(attendanceMark)
    .where(eq(attendanceMark.markDate, date))

  const lookup = new Map<string, RegisterEntry>()
  for (const row of rows) if (isAttendanceCode(row.code)) lookup.set(`${row.childId}:${row.session}`, { code: row.code, note: row.note })

  return pupils.map((pupil) => ({
    pupilId: pupil.id,
    pupilName: pupilDisplayName(pupil),
    am: lookup.get(`${pupil.id}:am`) ?? null,
    pm: lookup.get(`${pupil.id}:pm`) ?? null,
  }))
}

export type PupilAttendanceFlag = { pupilId: string; pupilName: string; percentage: number | null }

export type TodayOverview = {
  date: string
  pupilCount: number
  // Pupils with both sessions marked for today.
  complete: number
  closed: boolean
  noReasonYet: { pupilId: string; pupilName: string }[]
  lowAttendance: PupilAttendanceFlag[]
}

// For the staff home page. Staff only.
export async function getTodayOverview(user: CurrentUser, today: string): Promise<TodayOverview | null> {
  if (user.kind !== "staff") return null

  const pupils = await listPupilsFor(user)
  const rows = await getDb()
    .select({ childId: attendanceMark.childId, markDate: attendanceMark.markDate, session: attendanceMark.session, code: attendanceMark.code })
    .from(attendanceMark)
    .where(and(gte(attendanceMark.markDate, schoolYearStart(today)), lte(attendanceMark.markDate, today)))

  const byPupil = new Map<string, AttendanceMark[]>()
  for (const row of rows) {
    if (!isAttendanceCode(row.code) || !isAttendanceSession(row.session)) continue
    const list = byPupil.get(row.childId) ?? []
    list.push({ date: row.markDate, session: row.session, code: row.code })
    byPupil.set(row.childId, list)
  }

  let complete = 0
  let closedCount = 0
  const noReasonYet: TodayOverview["noReasonYet"] = []
  const lowAttendance: PupilAttendanceFlag[] = []

  for (const pupil of pupils) {
    const marks = byPupil.get(pupil.id) ?? []
    const todays = marks.filter((mark) => mark.date === today)
    if (todays.length >= 2) complete += 1
    if (todays.length > 0 && todays.every((mark) => mark.code === "closed")) closedCount += 1
    if (todays.some((mark) => mark.code === "no_reason")) noReasonYet.push({ pupilId: pupil.id, pupilName: pupilDisplayName(pupil) })

    const { percentage } = summarise(marks)
    if (isPersistentAbsence(percentage)) lowAttendance.push({ pupilId: pupil.id, pupilName: pupilDisplayName(pupil), percentage })
  }

  lowAttendance.sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
  return { date: today, pupilCount: pupils.length, complete, closed: pupils.length > 0 && closedCount === pupils.length, noReasonYet, lowAttendance }
}

export type DayAttendance = { am: AttendanceCode | null; pm: AttendanceCode | null }

// Codes only, so it is safe for parents. Keyed by date.
export async function getDayAttendanceFor(user: CurrentUser, pupilId: string, from: string, to: string): Promise<Map<string, DayAttendance>> {
  const days = new Map<string, DayAttendance>()
  if (!(await getPupilFor(user, pupilId))) return days

  for (const mark of await loadMarks(pupilId, from, to)) {
    const day = days.get(mark.date) ?? { am: null, pm: null }
    day[mark.session] = mark.code
    days.set(mark.date, day)
  }
  return days
}
