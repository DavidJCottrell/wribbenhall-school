"use client"

import { MenuIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { DisplaySettings } from "./display-settings"
import { Logo } from "./logo"
import { isActivePath, mainNavigation } from "./navigation"

const desktopLinks = mainNavigation.filter((item) => item.href !== "/" && item.href !== "/contact")

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="min-w-0 rounded-md text-ink" aria-label="Wribbenhall School, home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {desktopLinks.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-md px-3 py-2 text-[0.95rem] font-medium text-ink/80 transition-colors hover:text-ink",
                      "after:absolute after:inset-x-3 after:-bottom-[1.05rem] after:h-[3px] after:rounded-full after:bg-transparent",
                      active && "text-ink after:bg-buttercup",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li className="ml-3">
              <Button asChild variant={isActivePath(pathname, "/contact") ? "accent" : "default"}>
                <Link href="/contact" aria-current={isActivePath(pathname, "/contact") ? "page" : undefined}>
                  Contact us
                </Link>
              </Button>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-2">
        <DisplaySettings />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="max-sm:size-11 max-sm:px-0 lg:hidden" aria-label="Open menu">
              <MenuIcon />
              <span className="max-sm:sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,100vw)] bg-background">
            <SheetHeader>
              <SheetTitle className="font-display text-xl font-normal">Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Main" className="px-4">
              <ul className="flex flex-col">
                {mainNavigation.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  return (
                    <li key={item.href} className="border-b border-border last:border-0">
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 py-4 text-lg",
                          active ? "font-semibold text-ink" : "text-ink/80",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn("h-5 w-1 rounded-full", active ? "bg-buttercup" : "bg-transparent")}
                        />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
