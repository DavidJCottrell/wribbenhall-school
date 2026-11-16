import { PERSISTENT_ABSENCE_THRESHOLD } from "@/lib/attendance/stats"

type Props = {
  percentage: number | null
  label: string
}

// One ratio against a limit is a meter, not a pie. The mark shows the 90% line the DfE uses for persistent absence.
export function AttendanceMeter({ percentage, label }: Props) {
  if (percentage === null) return <p className="text-muted-foreground">No registers have been taken yet, so there is no figure to show.</p>

  return (
    <div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage} percent`}
        className="relative h-3 overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--chart-attended) 18%, var(--chart-surface))" }}
      >
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: "var(--chart-attended)" }} />
        <div aria-hidden="true" className="absolute inset-y-0 w-0.5" style={{ left: `${PERSISTENT_ABSENCE_THRESHOLD}%`, background: "var(--chart-surface)" }} />
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="absolute -translate-x-1/2" style={{ left: `${PERSISTENT_ABSENCE_THRESHOLD}%` }}>
          {PERSISTENT_ABSENCE_THRESHOLD}%
        </span>
      </div>
    </div>
  )
}
