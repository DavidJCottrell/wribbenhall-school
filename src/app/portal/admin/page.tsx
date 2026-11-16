import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/site/page-header"
import { can, type Permission } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Administration" }

const sections: { href: string; title: string; description: string; permission: Permission }[] = [
  { href: "/portal/admin/users", title: "Logins and permissions", description: "Create logins, choose what each member of staff can do, reset passwords and disable accounts.", permission: "users.manage" },
  { href: "/portal/admin/pupils", title: "Pupils", description: "Add pupils, complete their profiles and contacts, and link parent logins.", permission: "pupils.manage" },
  { href: "/portal/admin/audit", title: "Audit log", description: "See who viewed or changed records.", permission: "audit.view" },
]

export default async function AdminHomePage() {
  const user = await requireUser({ permission: sections.map((section) => section.permission) })
  const available = sections.filter((section) => can(user, section.permission))

  return (
    <>
      <PageHeader title="Administration" />
      <div className="container-page py-12 md:py-16">
        <ul className="grid gap-4 sm:grid-cols-2">
          {available.map((section) => (
            <li key={section.href}>
              <Link href={section.href} className="block h-full rounded-xl border border-border bg-card p-6 transition-colors hover:border-severn">
                <h2 className="text-heading">{section.title}</h2>
                <p className="mt-2 text-muted-foreground">{section.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
