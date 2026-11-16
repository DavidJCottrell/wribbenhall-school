"use client"

import { ClipboardCheckIcon, EllipsisIcon, Loader2Icon, PillIcon, SettingsIcon, ShieldAlertIcon, UserRoundIcon, UsersIcon, type LucideIcon } from "lucide-react"
import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { LinkProgress } from "./pending-link"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type PortalNavIcon = "pupils" | "register" | "medication" | "incidents" | "admin" | "account"

export type PortalNavItem = {
  href: string
  label: string
  icon: PortalNavIcon
  // The item is current when the path is one of these exactly, or sits under one of the prefixes.
  exact: string[]
  prefixes: string[]
  // Primary items sit in the phone's bottom bar. The rest go in its menu.
  primary: boolean
}

const icons: Record<PortalNavIcon, LucideIcon> = {
  pupils: UsersIcon,
  register: ClipboardCheckIcon,
  medication: PillIcon,
  incidents: ShieldAlertIcon,
  admin: SettingsIcon,
  account: UserRoundIcon,
}

const isCurrent = (pathname: string, item: PortalNavItem) =>
  item.exact.includes(pathname) || item.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

// Swaps the icon for a spinner while the page behind the link loads, without changing the icon's size.
function NavIcon({ icon }: { icon: PortalNavIcon }) {
  const { pending } = useLinkStatus()
  const Icon = pending ? Loader2Icon : icons[icon]
  return (
    <>
      <Icon aria-hidden="true" className={cn("size-5 shrink-0", pending && "animate-spin")} />
      <LinkProgress />
    </>
  )
}

type Props = { items: PortalNavItem[]; identity: { name: string; kind: string } }

export function PortalNav({ items, identity }: Props) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const primary = items.filter((item) => item.primary)
  const more = items.filter((item) => !item.primary)

  return (
    <>
      <div className="border-b border-border bg-secondary print:hidden">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2 md:py-2.5">
          <p className="text-sm md:text-base">
            <span className="font-semibold">{identity.name}</span>
            <span className="text-muted-foreground"> · {identity.kind}</span>
          </p>
          <nav aria-label="Portal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(pathname, item) ? "page" : undefined}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-base font-medium transition-colors hover:bg-background/70 active:scale-[0.97] aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                  >
                    <NavIcon icon={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <nav
        aria-label="Portal"
        data-portal-bar
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden print:hidden"
      >
        <ul className="flex">
          {primary.map((item) => (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isCurrent(pathname, item) ? "page" : undefined}
                className="relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted-foreground transition-colors active:bg-secondary aria-[current=page]:text-primary aria-[current=page]:before:absolute aria-[current=page]:before:top-0 aria-[current=page]:before:h-[3px] aria-[current=page]:before:w-10 aria-[current=page]:before:rounded-b aria-[current=page]:before:bg-primary"
              >
                <NavIcon icon={item.icon} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          ))}
          {more.length > 0 ? (
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  "relative flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted-foreground transition-colors active:bg-secondary",
                  more.some((item) => isCurrent(pathname, item)) && "text-primary",
                )}
              >
                <EllipsisIcon aria-hidden="true" className="size-5" />
                More
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription>
              Logged in as {identity.name} ({identity.kind})
            </SheetDescription>
          </SheetHeader>
          <ul className="px-2 pb-2">
            {more.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isCurrent(pathname, item) ? "page" : undefined}
                  className="flex min-h-14 items-center gap-3 rounded-lg px-3 text-lg font-medium transition-colors active:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:text-primary"
                >
                  <NavIcon icon={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
