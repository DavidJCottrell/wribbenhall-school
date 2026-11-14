import { cn } from "@/lib/utils"

// Three arches over the river, after Bewdley Bridge.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" className={cn("h-9 w-auto", className)} fill="none">
      <path
        d="M3 24V12h42v12M3 24h3a6 6 0 0 1 12 0h0M18 24a6 6 0 0 1 12 0M30 24a6 6 0 0 1 12 0h3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M3 8h42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M2 33c4.5-3 8.5-3 13 0s8.5 3 13 0 8.5-3 13 0c1.6 1 3.2 1.6 5 1.9"
        stroke="var(--buttercup)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark className="text-severn" />
      <span className="font-display text-lg leading-none tracking-tight whitespace-nowrap sm:text-[1.375rem]">Wribbenhall School</span>
    </span>
  )
}
