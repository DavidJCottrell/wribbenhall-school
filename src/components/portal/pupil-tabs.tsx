"use client"

import { CalendarCheckIcon, HeartPulseIcon, IdCardIcon, LayoutDashboardIcon, Loader2Icon, NotebookTextIcon, ShieldAlertIcon, type LucideIcon } from "lucide-react"
import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

import { LinkProgress } from "./pending-link"

export type PupilTabIcon = "overview" | "attendance" | "reports" | "incidents" | "medical" | "profile"
export type PupilTab = { href: string; label: string; icon: PupilTabIcon }

const icons: Record<PupilTabIcon, LucideIcon> = {
  overview: LayoutDashboardIcon,
  attendance: CalendarCheckIcon,
  reports: NotebookTextIcon,
  incidents: ShieldAlertIcon,
  medical: HeartPulseIcon,
  profile: IdCardIcon,
}

function TabIcon({ icon }: { icon: PupilTabIcon }) {
  const { pending } = useLinkStatus()
  const Icon = pending ? Loader2Icon : icons[icon]
  return (
    <>
      <Icon aria-hidden="true" className={cn("size-5 shrink-0 sm:size-4", pending && "animate-spin")} />
      <LinkProgress />
    </>
  )
}

// A grid of icon buttons on a phone, so every section is visible without sideways scrolling. A tab strip on wider screens.
export function PupilTabs({ tabs }: { tabs: PupilTab[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Pupil sections" className="container-page">
      <ul className="grid grid-cols-3 gap-1.5 pb-3 sm:-mb-px sm:flex sm:flex-wrap sm:gap-x-1 sm:gap-y-0 sm:pb-0">
        {tabs.map((tab, index) => {
          // The first tab is the overview, so it only matches its own address.
          const active = index === 0 ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-1 py-2.5 text-center text-sm leading-tight font-medium text-ink/80 transition-all hover:text-ink active:scale-[0.97]",
                  "sm:inline-flex sm:flex-row sm:gap-2 sm:rounded-none sm:border-0 sm:border-b-[3px] sm:border-transparent sm:bg-transparent sm:px-4 sm:py-3 sm:text-base sm:whitespace-nowrap",
                  active && "border-primary bg-secondary text-ink sm:border-buttercup sm:bg-transparent",
                )}
              >
                <TabIcon icon={tab.icon} />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
