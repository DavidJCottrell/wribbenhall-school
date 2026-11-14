"use client"

import { differenceInCalendarDays } from "date-fns"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { useToday } from "@/hooks/use-today"
import { formatMedium, toDate } from "@/lib/dates"

export function isClosed(closingDate: string, today: string) {
  return today > closingDate
}

export function ClosingStatus({ closingDate }: { closingDate: string }) {
  const today = useToday()
  const label = `Closes ${formatMedium(closingDate)}`

  if (!today) return <span>{label}</span>
  if (isClosed(closingDate, today)) {
    return <Badge variant="secondary" className="text-sm">Applications closed</Badge>
  }

  const daysLeft = differenceInCalendarDays(toDate(closingDate), toDate(today))
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {label}
      {daysLeft <= 7 ? (
        <Badge className="bg-buttercup text-sm text-ink">
          {daysLeft === 0 ? "Closes today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
        </Badge>
      ) : null}
    </span>
  )
}

// Renders children only while a vacancy is still open.
export function WhileOpen({ closingDate, closed, children }: { closingDate: string; closed: ReactNode; children: ReactNode }) {
  const today = useToday()
  if (today && isClosed(closingDate, today)) return closed
  return children
}
