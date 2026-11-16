import type { Metadata } from "next"
import { Suspense } from "react"

import { PortalShell } from "@/components/portal/portal-shell"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s | Portal | Wribbenhall School" },
  robots: { index: false, follow: false },
}

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <Suspense
      fallback={
        <div className="container-page py-12">
          <Skeleton className="h-10 w-64" />
        </div>
      }
    >
      <PortalShell>{children}</PortalShell>
    </Suspense>
  )
}
