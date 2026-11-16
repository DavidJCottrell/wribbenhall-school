import type { Metadata } from "next"
import Link from "next/link"

import { CreatePupilForm } from "@/components/portal/admin/create-pupil-form"
import { PageHeader } from "@/components/site/page-header"
import { Badge } from "@/components/ui/badge"
import { listPupilsForAdmin } from "@/lib/admin/queries"
import { requireUser } from "@/lib/auth/session"
import { pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Pupils" }

export default async function AdminPupilsPage() {
  const admin = await requireUser({ permission: "pupils.manage" })
  const pupils = await listPupilsForAdmin(admin)

  return (
    <>
      <PageHeader title="Pupils">
        <p>Add pupils, then open one to complete their profile, contacts and parent logins.</p>
      </PageHeader>

      <div className="container-page space-y-14 py-12 md:py-16">
        <section aria-labelledby="add-pupil" className="max-w-3xl rounded-xl border border-border bg-card p-6 md:p-9">
          <h2 id="add-pupil" className="text-heading mb-6">
            Add a pupil
          </h2>
          <CreatePupilForm />
        </section>

        <section aria-labelledby="all-pupils">
          <h2 id="all-pupils" className="text-heading mb-6">
            All pupils
          </h2>
          {pupils.length === 0 ? (
            <p className="text-muted-foreground">No pupils have been added yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pupils.map((pupil) => (
                <li key={pupil.id}>
                  <Link
                    href={`/portal/admin/pupils/${pupil.id}`}
                    className="block h-full rounded-xl border border-border bg-card p-6 transition-colors hover:border-severn"
                  >
                    <h3 className="text-lg font-semibold">{pupilDisplayName(pupil)}</h3>
                    <p className="mt-1 text-muted-foreground">{pupil.yearGroup}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{pupil.guardianCount === 1 ? "1 parent login" : `${pupil.guardianCount} parent logins`}</span>
                      {pupil.archived ? <Badge variant="outline">Archived</Badge> : null}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
