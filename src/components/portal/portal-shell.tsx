import Link from "next/link"
import type { ReactNode } from "react"

import { can, canAny } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"

export async function PortalShell({ children }: { children: ReactNode }) {
  // Pages do their own check. The shell must render for the account page while a password change is pending.
  const user = await requireUser({ allowPendingPasswordChange: true })
  const showAdministration = canAny(user, ["users.manage", "pupils.manage", "audit.view"])

  return (
    <>
      <div className="border-b border-border bg-secondary print:hidden">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <p>
            Logged in as <span className="font-semibold">{user.name}</span>
            <span className="text-muted-foreground"> ({user.kind === "parent" ? "Parent or carer" : "Staff"})</span>
          </p>
          <nav aria-label="Portal" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/portal" className="underline underline-offset-4">
              {user.kind === "parent" ? "Your children" : "Pupils"}
            </Link>
            {user.kind === "staff" ? (
              <Link href="/portal/register" className="underline underline-offset-4">
                Register
              </Link>
            ) : null}
            {can(user, "medical.view") ? (
              <Link href="/portal/medical" className="underline underline-offset-4">
                Medication
              </Link>
            ) : null}
            {can(user, "incidents.view") ? (
              <Link href="/portal/incidents" className="underline underline-offset-4">
                Incidents
              </Link>
            ) : null}
            <Link href="/portal/account" className="underline underline-offset-4">
              Account
            </Link>
            {showAdministration ? (
              <Link href="/portal/admin" className="underline underline-offset-4">
                Administration
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
      {children}
    </>
  )
}
