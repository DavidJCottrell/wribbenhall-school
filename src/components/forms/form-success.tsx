"use client"

import { CheckIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

export function FormSuccess({
  title,
  reference,
  children,
  onReset,
  resetLabel,
}: {
  title: string
  reference: string
  children: ReactNode
  onReset: () => void
  resetLabel: string
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="rounded-xl border-2 border-severn bg-card p-6 md:p-8" role="status">
      <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-6" />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="mt-5 text-heading outline-none">
        {title}
      </h3>
      <p className="mt-2 text-lg">
        Your reference is <strong className="font-semibold">{reference}</strong>
      </p>
      <div className="mt-4 space-y-3 text-ink/85">{children}</div>
      <Button variant="outline" className="mt-6" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  )
}
