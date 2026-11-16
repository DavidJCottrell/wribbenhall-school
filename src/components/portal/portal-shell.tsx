import type { ReactNode } from "react"

import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"

import { PortalNav, type PortalNavItem } from "./portal-nav"

export async function PortalShell({ children }: { children: ReactNode }) {
  // Pages do their own check. The shell must render for the account page while a password change is pending.
  const user = await requireUser({ allowPendingPasswordChange: true })
  const isParent = user.kind === "parent"

  const items: (PortalNavItem | false)[] = [
    { href: "/portal", label: isParent ? "Your children" : "Pupils", icon: "pupils", exact: ["/portal"], prefixes: ["/portal/pupils"], primary: true },
    !isParent && { href: "/portal/register", label: "Register", icon: "register", exact: [], prefixes: ["/portal/register"], primary: true },
    can(user, "medical.view") && { href: "/portal/medical", label: "Medication", icon: "medication", exact: [], prefixes: ["/portal/medical"], primary: true },
    can(user, "incidents.view") && { href: "/portal/incidents", label: "Incidents", icon: "incidents", exact: [], prefixes: ["/portal/incidents"], primary: true },
    { href: "/portal/account", label: "Account", icon: "account", exact: [], prefixes: ["/portal/account"], primary: isParent },
    (can(user, "users.manage") || can(user, "pupils.manage") || can(user, "audit.view")) && {
      href: "/portal/admin",
      label: "Administration",
      icon: "admin",
      exact: [],
      prefixes: ["/portal/admin"],
      primary: false,
    },
  ]

  return (
    <>
      <PortalNav items={items.filter((item) => item !== false)} identity={{ name: user.name, kind: isParent ? "Parent or carer" : "Staff" }} />
      {children}
    </>
  )
}
