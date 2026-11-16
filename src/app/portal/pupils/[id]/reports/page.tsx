import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { UpdateForm } from "@/components/portal/update-form"
import { UpdateList } from "@/components/portal/update-list"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { getPupilFor } from "@/lib/portal/pupils"
import { listUpdatesFor } from "@/lib/portal/updates"

export const metadata: Metadata = { title: "Daily reports" }

export default async function PupilReportsPage({ params }: PageProps<"/portal/pupils/[id]/reports">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  const pupil = pupilId.success ? await getPupilFor(user, pupilId.data) : null
  if (!pupil) notFound()

  const reports = await listUpdatesFor(user, pupil.id)

  return (
    <div className="container-page space-y-12 py-10">
      {can(user, "reports.write") ? (
        <section aria-labelledby="add-report" className="max-w-3xl rounded-xl border border-border bg-card p-6 md:p-9">
          <h2 id="add-report" className="text-heading mb-6">
            Add a daily report
          </h2>
          <UpdateForm childId={pupil.id} />
        </section>
      ) : null}

      <section aria-labelledby="reports" className="max-w-3xl">
        <h2 id="reports" className="text-heading mb-6">
          Daily reports
        </h2>
        <UpdateList updates={reports} childId={pupil.id} user={user} />
      </section>
    </div>
  )
}
