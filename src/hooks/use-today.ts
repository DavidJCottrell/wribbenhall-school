"use client"

import { useSyncExternalStore } from "react"

import { toIsoDate } from "@/lib/dates"

const subscribe = () => () => {}

// Returns today's date as YYYY-MM-DD in the browser, and null while prerendering,
// so date-relative UI never bakes the build date into static HTML.
export function useToday() {
  return useSyncExternalStore(
    subscribe,
    () => toIsoDate(new Date()),
    () => null,
  )
}
