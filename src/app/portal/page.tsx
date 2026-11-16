import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/site/page-header"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Home" }

export default async function PortalHomePage() {
  const user = await requireUser()
  const pupils = await listPupilsFor(user)

  const isParent = user.kind === "parent"
  const empty = isParent
    ? "No children are linked to your login yet. Please contact the school office."
    : can(user, "pupils.manage")
      ? "No pupils have been added yet. Add one under Administration."
      : "No pupils have been added yet."

  return (
    <>
      <PageHeader title={isParent ? "Your children" : "Pupils"} />

      <div className="container-page py-12 md:py-16">
        {pupils.length === 0 ? (
          <p className="measure text-muted-foreground">{empty}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pupils.map((pupil) => (
              <li key={pupil.id}>
                <Link
                  href={`/portal/pupils/${pupil.id}`}
                  className="block h-full rounded-xl border border-border bg-card p-6 transition-colors hover:border-severn"
                >
                  <h2 className="text-heading">{pupilDisplayName(pupil)}</h2>
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
