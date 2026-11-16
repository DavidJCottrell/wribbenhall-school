import type { ReactNode } from "react"

import { requireUser } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/roles"

import { SignOutButton } from "./sign-out-button"

const roleLabels: Record<UserRole, string> = {
  parent: "Parent or carer",
  staff: "Staff",
  admin: "Administrator",
}

export async function PortalShell({ children }: { children: ReactNode }) {
  const user = await requireUser()

  return (
    <>
      <div className="border-b border-border bg-secondary">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <p>
            Logged in as <span className="font-semibold">{user.name}</span>
            <span className="text-muted-foreground"> ({roleLabels[user.role]})</span>
          </p>
          <SignOutButton />
        </div>
      </div>
      {children}
    </>
  )
}
