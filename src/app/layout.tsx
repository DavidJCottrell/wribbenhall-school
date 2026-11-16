import type { Metadata, Viewport } from "next"
import { Suspense } from "react"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { Toaster } from "@/components/ui/sonner"
import { applySavedPreferencesScript } from "@/lib/display-preferences"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Wribbenhall School",
    template: "%s | Wribbenhall School",
  },
  description:
    "Wribbenhall School is a special school in Bewdley, Worcestershire, for children and young people aged 4 to 19 with complex learning needs.",
}

export const viewport: Viewport = {
  themeColor: "#f2f5f3",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySavedPreferencesScript }} />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to main content
        </a>
        {/* usePathname() needs a boundary on routes whose params aren't known at build time */}
        <Suspense fallback={<div aria-hidden="true" className="h-[4.5rem] border-b border-border/70" />}>
          <SiteHeader />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
