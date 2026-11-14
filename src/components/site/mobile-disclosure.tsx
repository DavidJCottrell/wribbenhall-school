"use client"

import { ChevronDownIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Collapses extra content behind a button on small screens only; from md up everything is shown.
export function MobileDisclosure({
  children,
  label = "Read more",
  openLabel = "Show less",
}: {
  children: ReactNode
  label?: string
  openLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()

  return (
    <>
      <div
        id={contentId}
        className={cn(
          "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "max-md:invisible max-md:grid-rows-[0fr] max-md:opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden max-md:-mb-px">{children}</div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md font-semibold text-severn underline decoration-2 underline-offset-4 md:hidden"
      >
        {open ? openLabel : label}
        <ChevronDownIcon aria-hidden="true" className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
      </button>
    </>
  )
}
