"use client"

import { EventDate } from "@/components/calendar/event-date"
import { Skeleton } from "@/components/ui/skeleton"
import { useToday } from "@/hooks/use-today"
import type { SchoolEvent } from "@/lib/content/schema"
import { formatRange, formatTimeRange } from "@/lib/dates"

export function UpcomingEvents({ events, limit = 4 }: { events: SchoolEvent[]; limit?: number }) {
  const today = useToday()

  if (!today) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2" aria-busy="true">
        {Array.from({ length: limit }, (_, index) => (
          <li key={index} className="flex gap-4">
            <Skeleton className="h-[4.75rem] w-16" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const upcoming = events
    .filter((event) => (event.endDate ?? event.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)

  if (upcoming.length === 0) {
    return <p className="text-muted-foreground">Dates for next term will be added here soon.</p>
  }

  return (
    <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
      {upcoming.map((event) => (
        <li key={event.id} className="flex gap-4">
          <EventDate date={event.date} />
          <div className="pt-1">
            <p className="font-semibold text-ink">{event.title}</p>
            <p className="text-muted-foreground">
              {event.endDate ? formatRange(event.date, event.endDate) : formatTimeRange(event.startTime, event.endTime)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
