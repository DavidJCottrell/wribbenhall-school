import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/site/page-header"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Administration" }

const sections = [
  { href: "/portal/admin/users", title: "Logins", description: "Create logins for parents and staff, reset passwords and disable accounts." },
  { href: "/portal/admin/pupils", title: "Pupils", description: "Add pupils, link their parents and carers, and assign staff." },
]

export default async function AdminHomePage() {
  await requireUser(["admin"])

  return (
    <>
      <PageHeader title="Administration" />
      <div className="container-page py-12 md:py-16">
        <ul className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
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
