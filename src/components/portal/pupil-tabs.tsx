"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type PupilTab = { href: string; label: string }

export function PupilTabs({ tabs }: { tabs: PupilTab[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Pupil sections" className="container-page">
      <ul className="-mb-px flex flex-wrap gap-x-1">
        {tabs.map((tab, index) => {
          // The first tab is the overview, so it only matches its own address.
          const active = index === 0 ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-[3px] border-transparent px-4 py-3 text-base font-medium text-ink/75 transition-colors hover:text-ink",
                  active && "border-buttercup text-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
