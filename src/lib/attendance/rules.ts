import { differenceInCalendarDays, parseISO } from "date-fns"

import { can, type Actor } from "@/lib/auth/permissions"

// People who can take the register, but not manage attendance, can correct today and the last few days.
export const RECENT_DAYS_EDITABLE = 7

// Registers are never taken for the future, whoever you are.
export function canRecordAttendanceOn(actor: Actor, date: string, today: string): boolean {
  const daysAgo = differenceInCalendarDays(parseISO(today), parseISO(date))
  if (daysAgo < 0) return false
  if (can(actor, "attendance.manage")) return true
  return can(actor, "attendance.record") && daysAgo <= RECENT_DAYS_EDITABLE
}
