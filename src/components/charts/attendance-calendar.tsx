import { format, parseISO } from "date-fns"

import { ATTENDANCE_CODES, SESSION_LABELS, categoryOf, type AttendanceCode } from "@/lib/attendance/codes"
import type { CalendarWeek } from "@/lib/attendance/stats"

import { SERIES_LABELS, TableView, seriesFill, type Series } from "./chart-primitives"

const LABEL_WIDTH = 56
const CELL_WIDTH = 44
const CELL_GAP = 8
const HALF_HEIGHT = 17
const ROW_HEIGHT = HALF_HEIGHT * 2 + 2 + 10
const HEADER_HEIGHT = 22
const DAYS = ["M", "T", "W", "T", "F"]
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

type Fill = Series | "closed" | "none"

function fillFor(code: AttendanceCode | null): Fill {
  if (code === null) return "none"
  const category = categoryOf(code)
  if (category === "present") return "attended"
  if (category === "authorised") return "authorised"
  if (category === "unauthorised") return "unauthorised"
  return "closed"
}

const fillStyle = (fill: Fill) => (fill === "closed" ? "var(--chart-closed)" : fill === "none" ? "none" : seriesFill(fill))
const describeCode = (code: AttendanceCode | null) => (code === null ? "no register" : ATTENDANCE_CODES[code].label.toLowerCase())

// Six weeks, Monday to Friday, with the morning above the afternoon in each day.
export function AttendanceCalendar({ weeks }: { weeks: CalendarWeek[] }) {
  const width = LABEL_WIDTH + 5 * (CELL_WIDTH + CELL_GAP)
  const height = HEADER_HEIGHT + weeks.length * ROW_HEIGHT

  return (
    <figure>
      <figcaption className="mb-3">
        <span className="block font-semibold">Recent school days</span>
        <span className="text-sm text-muted-foreground">Top square is the morning, bottom square the afternoon.</span>
      </figcaption>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="group" aria-label="Recent school days. Use the table below for every mark.">
          {DAYS.map((day, index) => (
            <text key={`${day}-${index}`} x={LABEL_WIDTH + index * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2} y={14} textAnchor="middle" fontSize="12" style={{ fill: "var(--chart-label)" }}>
              {day}
            </text>
          ))}
          {weeks.map((week, row) => {
            const top = HEADER_HEIGHT + row * ROW_HEIGHT
            return (
              <g key={week.weekStart}>
                <text x={LABEL_WIDTH - 10} y={top + HALF_HEIGHT + 4} textAnchor="end" fontSize="12" style={{ fill: "var(--chart-label)" }}>
                  {format(parseISO(week.weekStart), "d MMM")}
                </text>
                {week.days.map((day, column) => {
                  if (!day) return null
                  const x = LABEL_WIDTH + column * (CELL_WIDTH + CELL_GAP)
                  return (
                    <g key={day.date} role="img" aria-label={`${DAY_NAMES[column]} ${format(parseISO(day.date), "d MMMM")}: morning ${describeCode(day.am)}, afternoon ${describeCode(day.pm)}`}>
                      <title>{`${DAY_NAMES[column]} ${format(parseISO(day.date), "d MMM")}. ${SESSION_LABELS.am}: ${describeCode(day.am)}. ${SESSION_LABELS.pm}: ${describeCode(day.pm)}.`}</title>
                      {([day.am, day.pm] as const).map((code, half) => {
                        const fill = fillFor(code)
                        return (
                          <rect
                            key={half}
                            x={x}
                            y={top + half * (HALF_HEIGHT + 2)}
                            width={CELL_WIDTH}
                            height={HALF_HEIGHT}
                            rx="3"
                            style={{ fill: fillStyle(fill), stroke: fill === "none" ? "var(--chart-axis)" : "none" }}
                            strokeWidth="1"
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Key">
        {(["attended", "authorised", "unauthorised"] as const).map((series) => (
          <li key={series} className="flex items-center gap-2">
            <svg width="12" height="12" aria-hidden="true" focusable="false">
              <rect width="12" height="12" rx="2" style={{ fill: seriesFill(series) }} />
            </svg>
            {SERIES_LABELS[series]}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true" focusable="false">
            <rect width="12" height="12" rx="2" style={{ fill: "var(--chart-closed)" }} />
          </svg>
          School closed
        </li>
        <li className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true" focusable="false">
            <rect x="0.5" y="0.5" width="11" height="11" rx="2" fill="none" style={{ stroke: "var(--chart-axis)" }} />
          </svg>
          No register
        </li>
      </ul>

      <TableView
        caption="Recent school days"
        headers={["Day", SESSION_LABELS.am, SESSION_LABELS.pm]}
        rows={weeks.flatMap((week) =>
          week.days.flatMap((day) => (day ? [[format(parseISO(day.date), "EEE d MMM"), day.am ? ATTENDANCE_CODES[day.am].label : "No register", day.pm ? ATTENDANCE_CODES[day.pm].label : "No register"]] : [])),
        )}
      />
    </figure>
  )
}
