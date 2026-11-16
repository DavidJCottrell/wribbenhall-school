import { differenceInYears, format, parseISO } from "date-fns"
import { enGB } from "date-fns/locale"

// Content dates are plain YYYY-MM-DD strings in UK local time. Parsing them with
// parseISO keeps them as local midnight, so no timezone drift in the browser.
export const toDate = (isoDate: string) => parseISO(isoDate)

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd")

export const formatLong = (isoDate: string) => format(toDate(isoDate), "EEEE d MMMM yyyy", { locale: enGB })

export const formatMedium = (isoDate: string) => format(toDate(isoDate), "d MMMM yyyy", { locale: enGB })

export const formatShort = (isoDate: string) => format(toDate(isoDate), "EEE d MMM", { locale: enGB })

export function formatRange(start: string, end?: string) {
  if (!end || end === start) return formatLong(start)
  const from = toDate(start)
  const to = toDate(end)
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
  return sameMonth
    ? `${format(from, "EEEE d", { locale: enGB })} to ${format(to, "EEEE d MMMM yyyy", { locale: enGB })}`
    : `${format(from, "d MMMM", { locale: enGB })} to ${format(to, "d MMMM yyyy", { locale: enGB })}`
}

export function formatClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const suffix = hours >= 12 ? "pm" : "am"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return minutes === 0 ? `${hour12}${suffix}` : `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`
}

export function formatTimeRange(start?: string, end?: string) {
  if (start && end) return `${formatClock(start)} to ${formatClock(end)}`
  if (start) return `From ${formatClock(start)}`
  if (end) return `Finishes ${formatClock(end)}`
  return "All day"
}

// Whole years between a date of birth and a given day, both as YYYY-MM-DD.
export const ageOn = (dateOfBirth: string, onDay: string) => differenceInYears(parseISO(onDay), parseISO(dateOfBirth))
