"use client"

import { format, parseISO } from "date-fns"
import { useCallback, useState } from "react"

import type { WeekSummary } from "@/lib/attendance/stats"

import { Legend, SERIES_LABELS, TableView, seriesFill, type Series } from "./chart-primitives"

// Drawn at the width it is shown at, so bars keep their real 24px cap and text its real size.
const FALLBACK_WIDTH = 640
const MIN_WIDTH = 260
const HEIGHT = 250
const MARGIN = { top: 12, right: 8, bottom: 42, left: 34 }
const BAR_MAX = 24
const GAP = 2
const RADIUS = 4

const label = (weekStart: string) => format(parseISO(weekStart), "d MMM")

function describe(week: WeekSummary) {
  if (week.sessions === 0) return `Week of ${label(week.weekStart)}: no register taken`
  const parts = [`${week.attended} attended`]
  if (week.authorisedAbsences) parts.push(`${week.authorisedAbsences} authorised ${week.authorisedAbsences === 1 ? "absence" : "absences"}`)
  if (week.unauthorisedAbsences) parts.push(`${week.unauthorisedAbsences} unauthorised ${week.unauthorisedAbsences === 1 ? "absence" : "absences"}`)
  return `Week of ${label(week.weekStart)}: ${parts.join(", ")} (${week.percentage}%)`
}

// A bar with its top corners rounded and its bottom square, so it sits flat on the baseline.
function roundedTop(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

export function WeeklyAttendanceChart({ weeks }: { weeks: WeekSummary[] }) {
  const latestWithData = weeks.map((week) => week.sessions > 0).lastIndexOf(true)
  const [active, setActive] = useState<number | null>(null)
  const [measured, setMeasured] = useState(FALLBACK_WIDTH)
  const shown = active ?? (latestWithData >= 0 ? latestWithData : null)

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const update = () => setMeasured(Math.round(node.clientWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const width = Math.max(MIN_WIDTH, measured)
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maxSessions = Math.max(10, ...weeks.map((week) => week.sessions))
  const band = plotWidth / weeks.length
  const barWidth = Math.min(BAR_MAX, band * 0.55)
  // Labels thin out as bars get narrower, always keeping the latest week.
  const labelStep = band >= 56 ? 1 : band >= 30 ? 2 : 3
  const yFor = (value: number) => MARGIN.top + plotHeight - (value / maxSessions) * plotHeight
  const ticks = [0, maxSessions / 2, maxSessions]

  return (
    <figure>
      <figcaption className="mb-2">
        <span className="block font-semibold">Sessions each week</span>
        <span className="text-sm text-muted-foreground">Each school day has a morning and an afternoon session.</span>
      </figcaption>

      <p aria-live="polite" className="mb-3 min-h-6 text-sm">
        {shown === null ? "No registers yet in this period." : describe(weeks[shown])}
      </p>

      <div ref={measure} className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="group" aria-label="Weekly attendance. Use the table below for every value.">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} style={{ stroke: tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} strokeWidth="1" />
              <text x={MARGIN.left - 8} y={yFor(tick)} textAnchor="end" dominantBaseline="middle" fontSize="12" style={{ fill: "var(--chart-label)" }}>
                {tick}
              </text>
            </g>
          ))}

          {weeks.map((week, index) => {
            const x = MARGIN.left + band * index + (band - barWidth) / 2
            const segments: { series: Series; value: number }[] = [
              { series: "attended", value: week.attended },
              { series: "authorised", value: week.authorisedAbsences },
              { series: "unauthorised", value: week.unauthorisedAbsences },
            ]
            const visible = segments.filter((segment) => segment.value > 0)

            let cursor = yFor(0)
            return (
              <g
                key={week.weekStart}
                tabIndex={0}
                role="img"
                aria-label={describe(week)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none [&:focus-visible>.focus-ring]:opacity-100"
              >
                {/* A wide, invisible target: bigger than the bar, so it is easy to hit. */}
                <rect x={MARGIN.left + band * index} y={MARGIN.top} width={band} height={plotHeight + 20} fill="transparent" />
                <rect className="focus-ring opacity-0" x={MARGIN.left + band * index + 2} y={MARGIN.top} width={band - 4} height={plotHeight + 4} rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                {visible.map((segment, segmentIndex) => {
                  const height = (segment.value / maxSessions) * plotHeight - (segmentIndex > 0 ? GAP : 0)
                  const y = cursor - height - (segmentIndex > 0 ? GAP : 0)
                  cursor = y
                  const isTop = segmentIndex === visible.length - 1
                  return isTop ? (
                    <path key={segment.series} d={roundedTop(x, y, barWidth, Math.max(height, 1))} style={{ fill: seriesFill(segment.series) }} />
                  ) : (
                    <rect key={segment.series} x={x} y={y} width={barWidth} height={Math.max(height, 1)} style={{ fill: seriesFill(segment.series) }} />
                  )
                })}
                {index % labelStep === (weeks.length - 1) % labelStep ? (
                  <text x={MARGIN.left + band * index + band / 2} y={HEIGHT - 18} textAnchor="middle" fontSize="12" style={{ fill: "var(--chart-label)" }}>
                    {label(week.weekStart)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3">
        <Legend series={["attended", "authorised", "unauthorised"]} />
      </div>

      <TableView
        caption="Sessions each week"
        headers={["Week of", "Sessions", SERIES_LABELS.attended, SERIES_LABELS.authorised, SERIES_LABELS.unauthorised, "Attendance"]}
        rows={weeks.map((week) => [label(week.weekStart), week.sessions, week.attended, week.authorisedAbsences, week.unauthorisedAbsences, week.percentage === null ? "No register" : `${week.percentage}%`])}
      />
    </figure>
  )
}
