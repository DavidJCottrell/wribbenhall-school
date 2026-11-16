import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/site/page-header"
import { requireUser } from "@/lib/auth/session"
import { listChildrenFor } from "@/lib/portal/children"

export const metadata: Metadata = { title: "Home" }

export default async function PortalHomePage() {
  const user = await requireUser()
  const children = await listChildrenFor(user)

  return (
    <>
      <PageHeader title={user.role === "parent" ? "Your children" : "Pupils"} />

      <div className="container-page py-12 md:py-16">
        {children.length === 0 ? (
          <p className="measure text-muted-foreground">
            {user.role === "parent"
              ? "No children are linked to your login yet. Please contact the school office."
              : "No pupils are assigned to you yet."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((pupil) => (
              <li key={pupil.id}>
                <Link
                  href={`/portal/children/${pupil.id}`}
                  className="block rounded-xl border border-border bg-card p-6 transition-colors hover:border-severn"
                >
                  <h2 className="text-heading">
                    {pupil.firstName} {pupil.lastName}
                  </h2>
                  <p className="mt-1 text-muted-foreground">{pupil.yearGroup}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
