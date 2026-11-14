import { format } from "date-fns"

import { toDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

// Tear-off calendar style date: weekday, big day number, month.
export function EventDate({ date, className }: { date: string; className?: string }) {
  const day = toDate(date)
  return (
    <time
      dateTime={date}
      className={cn(
        "flex w-16 shrink-0 flex-col items-center rounded-lg border border-border bg-card pt-1.5 pb-2 leading-none",
        className,
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">{format(day, "EEE")}</span>
      <span className="mt-1 font-display text-[1.75rem] text-ink">{format(day, "d")}</span>
      <span className="mt-0.5 text-sm text-ink/80">{format(day, "MMM")}</span>
    </time>
  )
}
