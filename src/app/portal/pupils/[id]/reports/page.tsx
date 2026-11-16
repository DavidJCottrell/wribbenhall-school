import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { DayReportForm } from "@/components/portal/day-report-form"
import { DayReportList } from "@/components/portal/day-report-list"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatMedium, ukToday } from "@/lib/dates"
import { getDayByDayFor } from "@/lib/portal/day-reports"
import { getPupilFor } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Daily reports" }

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default async function PupilReportsPage({ params, searchParams }: PageProps<"/portal/pupils/[id]/reports">) {
  const { id } = await params
  const { before } = await searchParams
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  const pupil = pupilId.success ? await getPupilFor(user, pupilId.data) : null
  if (!pupil) notFound()

  const today = ukToday()
  const requested = dateSchema.safeParse(before)
  const windowEnd = requested.success && !Number.isNaN(Date.parse(requested.data)) && requested.data <= today ? requested.data : today

  const view = await getDayByDayFor(user, pupil.id, windowEnd)
  if (!view) notFound()

  const basePath = `/portal/pupils/${pupil.id}/reports`

  return (
    <div className="container-page space-y-12 py-10">
      {can(user, "reports.write") ? (
        <section aria-labelledby="add-report" className="max-w-3xl rounded-xl border border-border bg-card p-6 md:p-9">
          <h2 id="add-report" className="text-heading mb-6">
            Add a daily report
          </h2>
          <DayReportForm childId={pupil.id} />
        </section>
      ) : null}

      <section aria-labelledby="reports" className="max-w-3xl">
        <h2 id="reports" className="text-heading mb-2">
          Day by day
        </h2>
        <p className="mb-6 text-muted-foreground">
          {formatMedium(view.from)} to {formatMedium(view.to)}
        </p>
        <DayReportList days={view.days} childId={pupil.id} user={user} />
        <nav aria-label="Other days" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {windowEnd !== today ? (
            <Link href={basePath} className="underline underline-offset-4">
              Back to the latest days
            </Link>
          ) : null}
          {view.earlierEnd ? (
            <Link href={`${basePath}?before=${view.earlierEnd}`} className="underline underline-offset-4">
              Earlier reports
            </Link>
          ) : null}
        </nav>
      </section>
    </div>
  )
}
