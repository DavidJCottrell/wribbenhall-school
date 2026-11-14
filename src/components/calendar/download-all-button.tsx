"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SchoolEvent } from "@/lib/content/schema"
import { downloadCalendar } from "@/lib/ics"

export function DownloadAllButton({ events }: { events: SchoolEvent[] }) {
  return (
    <Button variant="outline" className="w-full" onClick={() => downloadCalendar(events, "wribbenhall-school.ics")}>
      <DownloadIcon />
      Download all dates
    </Button>
  )
}
