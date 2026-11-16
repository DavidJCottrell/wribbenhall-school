import { addDays, format, getISODay, parseISO, startOfISOWeek, subDays } from "date-fns"

import { ATTENDANCE_CODES, categoryOf, isAbsence, type AttendanceCode, type AttendanceMark, type AttendanceSession } from "./codes"

// Below this, a pupil has missed 10% or more of sessions, which the DfE calls persistent absence.
export const PERSISTENT_ABSENCE_THRESHOLD = 90

export type AttendanceSummary = {
  // Sessions the register was taken for. Days the school was closed are not counted.
  sessions: number
  attended: number
  late: number
  authorisedAbsences: number
  unauthorisedAbsences: number
  // Null when there is nothing to measure yet.
  percentage: number | null
}

const round1 = (value: number) => Math.round(value * 10) / 10

export function summarise(marks: readonly AttendanceMark[]): AttendanceSummary {
  let attended = 0
  let late = 0
  let authorised = 0
  let unauthorised = 0

  for (const mark of marks) {
    const category = categoryOf(mark.code)
    if (category === "closed") continue
    if (category === "present") attended += 1
    if (mark.code === "late") late += 1
    if (category === "authorised") authorised += 1
    if (category === "unauthorised") unauthorised += 1
  }

  const sessions = attended + authorised + unauthorised
  return {
    sessions,
    attended,
    late,
    authorisedAbsences: authorised,
    unauthorisedAbsences: unauthorised,
    percentage: sessions === 0 ? null : round1((attended / sessions) * 100),
  }
}

export const isPersistentAbsence = (percentage: number | null) => percentage !== null && percentage < PERSISTENT_ABSENCE_THRESHOLD

// The school year runs from 1 September.
export function schoolYearStart(today: string) {
  const date = parseISO(today)
  const year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1
  return `${year}-09-01`
}

export type WeekSummary = AttendanceSummary & {
  // The Monday of the week.
  weekStart: string
}

// One entry per week, oldest first, ending with the week that contains today. Weeks with no register still appear.
export function weeklyBreakdown(marks: readonly AttendanceMark[], { weeks, today }: { weeks: number; today: string }): WeekSummary[] {
  const thisMonday = startOfISOWeek(parseISO(today))
  const starts = Array.from({ length: weeks }, (_, index) => format(subDays(thisMonday, (weeks - 1 - index) * 7), "yyyy-MM-dd"))

  const byWeek = new Map<string, AttendanceMark[]>(starts.map((start) => [start, []]))
  for (const mark of marks) {
    const start = format(startOfISOWeek(parseISO(mark.date)), "yyyy-MM-dd")
    byWeek.get(start)?.push(mark)
  }

  return starts.map((weekStart) => ({ weekStart, ...summarise(byWeek.get(weekStart) ?? []) }))
}

export type DayEntry = {
  date: string
  am: AttendanceCode | null
  pm: AttendanceCode | null
}

// The last few weekdays up to and including today, oldest first. A day with no register has null marks.
export function dayStrip(marks: readonly AttendanceMark[], { weekdays, today }: { weekdays: number; today: string }): DayEntry[] {
  const dates: string[] = []
  let cursor = parseISO(today)
  while (dates.length < weekdays) {
    if (getISODay(cursor) <= 5) dates.unshift(format(cursor, "yyyy-MM-dd"))
    cursor = subDays(cursor, 1)
  }

  const lookup = new Map<string, AttendanceCode>(marks.map((mark) => [`${mark.date}:${mark.session}`, mark.code]))
  const markFor = (date: string, session: AttendanceSession) => lookup.get(`${date}:${session}`) ?? null
  return dates.map((date) => ({ date, am: markFor(date, "am"), pm: markFor(date, "pm") }))
}

export type AbsenceReason = { code: AttendanceCode; label: string; count: number }

// Why sessions were missed, most common first.
export function absenceReasons(marks: readonly AttendanceMark[]): AbsenceReason[] {
  const counts = new Map<AttendanceCode, number>()
  for (const mark of marks) if (isAbsence(mark.code)) counts.set(mark.code, (counts.get(mark.code) ?? 0) + 1)

  return [...counts.entries()]
    .map(([code, count]) => ({ code, label: ATTENDANCE_CODES[code].label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export const isWeekday = (date: string) => getISODay(parseISO(date)) <= 5

// The next or previous school day, skipping weekends.
export function adjacentWeekday(date: string, direction: 1 | -1) {
  let cursor = addDays(parseISO(date), direction)
  while (getISODay(cursor) > 5) cursor = addDays(cursor, direction)
  return format(cursor, "yyyy-MM-dd")
}

export type CalendarWeek = {
  // The Monday of the week.
  weekStart: string
  // Monday to Friday. A day outside the range shown is null.
  days: (DayEntry | null)[]
}

// Lays a run of weekdays out as calendar rows of Monday to Friday, oldest week first.
export function groupByWeek(days: readonly DayEntry[]): CalendarWeek[] {
  const weeks = new Map<string, (DayEntry | null)[]>()
  for (const day of days) {
    const date = parseISO(day.date)
    const weekStart = format(startOfISOWeek(date), "yyyy-MM-dd")
    const row = weeks.get(weekStart) ?? [null, null, null, null, null]
    row[getISODay(date) - 1] = day
    weeks.set(weekStart, row)
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, row]) => ({ weekStart, days: row }))
}
