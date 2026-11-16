import { ATTENDANCE_CODES, categoryOf } from "@/lib/attendance/codes"
import type { AbsenceReason } from "@/lib/attendance/stats"

import { TableView, seriesFill } from "./chart-primitives"

const WIDTH = 300
const BAR_HEIGHT = 16
const RADIUS = 4
const VALUE_SPACE = 34

// Flat at the left baseline, rounded at the data end.
function roundedEnd(length: number) {
  const r = Math.min(RADIUS, length / 2)
  return `M0,0 H${length - r} Q${length},0 ${length},${r} V${BAR_HEIGHT - r} Q${length},${BAR_HEIGHT} ${length - r},${BAR_HEIGHT} H0 Z`
}

export function AbsenceReasonsChart({ reasons }: { reasons: AbsenceReason[] }) {
  const max = Math.max(1, ...reasons.map((reason) => reason.count))

  return (
    <figure>
      <figcaption className="mb-3">
        <span className="block font-semibold">Why sessions were missed</span>
        <span className="text-sm text-muted-foreground">This school year, most common first.</span>
      </figcaption>

      {reasons.length === 0 ? (
        <p className="text-muted-foreground">No sessions have been missed this school year.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {reasons.map((reason) => {
              const length = Math.max(2, (reason.count / max) * (WIDTH - VALUE_SPACE))
              const series = categoryOf(reason.code) === "unauthorised" ? "unauthorised" : "authorised"
              return (
                <li key={reason.code} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[14rem_1fr]">
                  <span className="text-sm">{ATTENDANCE_CODES[reason.code].label}</span>
                  <svg viewBox={`0 0 ${WIDTH} ${BAR_HEIGHT}`} height={BAR_HEIGHT} className="w-full max-w-[300px]" preserveAspectRatio="xMinYMid meet" role="img" aria-label={`${reason.label}: ${reason.count} ${reason.count === 1 ? "session" : "sessions"}`}>
                    <path d={roundedEnd(length)} style={{ fill: seriesFill(series) }} />
                    <text x={length + 8} y={BAR_HEIGHT / 2} dominantBaseline="middle" fontSize="13" style={{ fill: "var(--ink)" }}>
                      {reason.count}
                    </text>
                  </svg>
                </li>
              )
            })}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Key">
            {(["authorised", "unauthorised"] as const).map((series) => (
              <li key={series} className="flex items-center gap-2">
                <svg width="12" height="12" aria-hidden="true" focusable="false">
                  <rect width="12" height="12" rx="2" style={{ fill: seriesFill(series) }} />
                </svg>
                {series === "authorised" ? "Authorised" : "Unauthorised"}
              </li>
            ))}
          </ul>
          <TableView caption="Why sessions were missed" headers={["Reason", "Sessions", "Type"]} rows={reasons.map((reason) => [reason.label, reason.count, categoryOf(reason.code) === "unauthorised" ? "Unauthorised" : "Authorised"])} />
        </>
      )}
    </figure>
  )
}
