"use client"

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { enGB } from "date-fns/locale"
import { CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useToday } from "@/hooks/use-today"
import type { EventCategory, SchoolEvent } from "@/lib/content/schema"
import { formatLong, formatRange, formatTimeRange, toDate, toIsoDate } from "@/lib/dates"
import { downloadCalendar } from "@/lib/ics"
import { cn } from "@/lib/utils"

import { categoryOrder, eventCategories } from "./categories"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function occursOn(event: SchoolEvent, isoDay: string) {
  return isoDay >= event.date && isoDay <= (event.endDate ?? event.date)
}

function overlapsMonth(event: SchoolEvent, month: Date) {
  const first = toIsoDate(startOfMonth(month))
  const last = toIsoDate(endOfMonth(month))
  return event.date <= last && (event.endDate ?? event.date) >= first
}

export function CalendarView({ events }: { events: SchoolEvent[] }) {
  const today = useToday()
  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events])

  const usedCategories = useMemo(
    () => categoryOrder.filter((category) => events.some((event) => event.category === category)),
    [events],
  )
  const [visibleCategories, setVisibleCategories] = useState<EventCategory[]>(categoryOrder)
  const [monthOverride, setMonthOverride] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const fallbackMonth = sorted[0] ? toDate(sorted[0].date) : new Date(2026, 8, 1)
  const month = startOfMonth(monthOverride ?? (today ? toDate(today) : fallbackMonth))

  const filtered = sorted.filter((event) => visibleCategories.includes(event.category))
  const monthEvents = filtered.filter((event) => overlapsMonth(event, month))
  const listedEvents = selectedDay ? monthEvents.filter((event) => occursOn(event, selectedDay)) : monthEvents

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  const monthLabel = format(month, "MMMM yyyy", { locale: enGB })

  function changeMonth(offset: number) {
    setMonthOverride(addMonths(month, offset))
    setSelectedDay(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-heading" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMonthOverride(null)
              setSelectedDay(null)
            }}
            disabled={!today}
          >
            This month
          </Button>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold text-muted-foreground">Show</legend>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={visibleCategories}
          onValueChange={(value) => setVisibleCategories(value as EventCategory[])}
          className="flex w-full flex-wrap justify-start gap-2 shadow-none"
        >
          {usedCategories.map((category) => (
            <ToggleGroupItem
              key={category}
              value={category}
              className="h-9 flex-none gap-2 rounded-full! border px-3.5 text-sm data-[state=off]:text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-ink"
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", eventCategories[category].swatch)}
              />
              {eventCategories[category].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/60 text-center text-sm font-semibold text-muted-foreground">
          {weekdays.map((day) => (
            <div key={day} className="py-2.5">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = toIsoDate(day)
            const dayEvents = filtered.filter((event) => occursOn(event, iso))
            const inMonth = isSameMonth(day, month)
            const isToday = iso === today
            const isSelected = iso === selectedDay

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : iso)}
                aria-pressed={isSelected}
                aria-label={`${formatLong(iso)}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                className={cn(
                  "relative flex min-h-16 flex-col items-start gap-1 border-r border-b border-border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-muted/50 text-muted-foreground/70",
                  isSelected ? "bg-buttercup/25" : "hover:bg-secondary/70",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-sm",
                    isToday && "bg-severn font-semibold text-white",
                  )}
                >
                  {format(day, "d")}
                </span>
                <span className="hidden w-full flex-col gap-1 sm:flex">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "block w-full truncate rounded px-1.5 py-0.5 text-xs font-medium",
                        eventCategories[event.category].chip,
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className="text-xs text-muted-foreground">{dayEvents.length - 2} more</span>
                  ) : null}
                </span>
                <span className="flex gap-1 sm:hidden" aria-hidden="true">
                  {dayEvents.slice(0, 3).map((event) => (
                    <span key={event.id} className={cn("size-2 rounded-full", eventCategories[event.category].swatch)} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-subheading">
            {selectedDay ? formatLong(selectedDay) : `Everything in ${monthLabel}`}
          </h2>
          {selectedDay ? (
            <Button variant="link" className="h-auto px-0" onClick={() => setSelectedDay(null)}>
              Show the whole month
            </Button>
          ) : null}
        </div>

        {listedEvents.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-input p-6 text-muted-foreground">
            {selectedDay
              ? "Nothing on this day. Pick another date, or show the whole month."
              : "No events this month for the categories you've chosen. Try another month or turn more categories on."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {listedEvents.map((event) => (
              <li key={event.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 h-10 w-1.5 shrink-0 rounded-full", eventCategories[event.category].swatch)}
                  />
                  <div>
                    <h3 className="font-sans text-lg font-semibold text-ink">{event.title}</h3>
                    <p className="text-ink/80">
                      {formatRange(event.date, event.endDate)}
                      {event.endDate ? null : <>, {formatTimeRange(event.startTime, event.endTime).toLowerCase()}</>}
                    </p>
                    {event.location ? <p className="text-muted-foreground">{event.location}</p> : null}
                    {event.description ? <p className="mt-2 max-w-prose text-ink/90">{event.description}</p> : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start sm:justify-self-end"
                  onClick={() => downloadCalendar([event], `${event.id}.ics`)}
                >
                  <CalendarPlusIcon />
                  Add to calendar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
