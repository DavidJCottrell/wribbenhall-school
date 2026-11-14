import { addDays, format } from "date-fns"

import type { SchoolEvent } from "@/lib/content/schema"
import { toDate } from "@/lib/dates"

const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

function eventLines(event: SchoolEvent) {
  const start = toDate(event.date)
  const lines = ["BEGIN:VEVENT", `UID:${event.id}@wribbenhall-school`, `SUMMARY:${escapeText(event.title)}`]

  if (event.startTime) {
    const day = format(start, "yyyyMMdd")
    const end = event.endTime ?? event.startTime
    lines.push(
      `DTSTART;TZID=Europe/London:${day}T${event.startTime.replace(":", "")}00`,
      `DTEND;TZID=Europe/London:${day}T${end.replace(":", "")}00`,
    )
  } else {
    // All-day events use an exclusive end date
    const last = event.endDate ? toDate(event.endDate) : start
    lines.push(
      `DTSTART;VALUE=DATE:${format(start, "yyyyMMdd")}`,
      `DTEND;VALUE=DATE:${format(addDays(last, 1), "yyyyMMdd")}`,
    )
  }

  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  lines.push("END:VEVENT")
  return lines
}

export function buildCalendar(events: SchoolEvent[], stamp: Date) {
  const dtstamp = format(stamp, "yyyyMMdd'T'HHmmss")
  const body = events.flatMap((event) => {
    const lines = eventLines(event)
    lines.splice(2, 0, `DTSTAMP:${dtstamp}`)
    return lines
  })

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wribbenhall School//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Wribbenhall School",
    ...body,
    "END:VCALENDAR",
  ].join("\r\n")
}

export function downloadCalendar(events: SchoolEvent[], fileName: string) {
  const blob = new Blob([buildCalendar(events, new Date())], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
