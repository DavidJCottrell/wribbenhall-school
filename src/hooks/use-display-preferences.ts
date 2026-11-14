"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  CHANGE_EVENT,
  readColourScheme,
  readTextSize,
  savePreferences,
  type ColourScheme,
  type TextSize,
} from "@/lib/display-preferences"

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

export function useDisplayPreferences() {
  const textSize = useSyncExternalStore(subscribe, readTextSize, () => "default" as const)
  const colourScheme = useSyncExternalStore(subscribe, readColourScheme, () => "default" as const)

  const setTextSize = useCallback((next: TextSize) => savePreferences({ textSize: next, colourScheme: readColourScheme() }), [])
  const setColourScheme = useCallback(
    (next: ColourScheme) => savePreferences({ textSize: readTextSize(), colourScheme: next }),
    [],
  )
  const reset = useCallback(() => savePreferences({ textSize: "default", colourScheme: "default" }), [])

  return { textSize, colourScheme, setTextSize, setColourScheme, reset }
}
