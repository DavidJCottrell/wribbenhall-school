import type { Metadata } from "next"
import Link from "next/link"

import { DashboardCard } from "@/components/portal/dashboard-card"
import { PageHeader } from "@/components/site/page-header"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatLong, ukNowTime, ukToday } from "@/lib/dates"
import { getTodayOverview } from "@/lib/portal/attendance"
import { countUnclosedIncidents } from "@/lib/portal/incidents"
import { getTodayMedical } from "@/lib/portal/medical"
import { listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Home" }

export default async function PortalHomePage() {
  const user = await requireUser()
  const today = ukToday()
  const [pupils, overview, incidentCounts, medication] = await Promise.all([listPupilsFor(user), getTodayOverview(user, today), countUnclosedIncidents(user), getTodayMedical(user, today, ukNowTime())])
  const doses = medication?.flatMap((item) => item.doses) ?? []
  const overdueDoses = doses.filter((dose) => dose.status === "overdue").length
  const dueDoses = doses.filter((dose) => dose.status === "due").length

  const isParent = user.kind === "parent"
  const empty = isParent
    ? "No children are linked to your login yet. Please contact the school office."
    : can(user, "pupils.manage")
      ? "No pupils have been added yet. Add one under Administration."
      : "No pupils have been added yet."

  return (
    <>
      <PageHeader title={isParent ? "Your children" : "Pupils"} />

      <div className="container-page space-y-12 py-12 md:py-16">
        {overview && overview.pupilCount > 0 ? (
          <section aria-labelledby="today" className="space-y-4">
            <h2 id="today" className="text-heading">
              Today, {formatLong(today)}
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <DashboardCard title="Register" href="/portal/register" hrefLabel={can(user, "attendance.record") ? "Take the register" : "View the register"}>
                {overview.closed ? (
                  <p>The school is marked as closed today.</p>
                ) : (
                  <p>
                    <span className="text-3xl font-semibold">
                      {overview.complete} of {overview.pupilCount}
                    </span>{" "}
                    <span className="text-muted-foreground">pupils marked for both sessions</span>
                  </p>
                )}
              </DashboardCard>
              <DashboardCard title="No reason given yet">
                {overview.noReasonYet.length === 0 ? (
                  <p className="text-muted-foreground">Nobody is absent without a reason today.</p>
                ) : (
                  <ul className="space-y-2">
                    {overview.noReasonYet.map((entry) => (
                      <li key={entry.pupilId}>
                        <Link href={`/portal/pupils/${entry.pupilId}/attendance`} className="underline underline-offset-4">
                          {entry.pupilName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>
              {medication ? (
                <DashboardCard title="Medication" href="/portal/medical" hrefLabel="See medication today">
                  {doses.length === 0 ? (
                    <p className="text-muted-foreground">No scheduled medication today.</p>
                  ) : (
                    <p>
                      <span className="text-3xl font-semibold">{overdueDoses}</span> <span className="text-muted-foreground">overdue</span>
                      {" · "}
                      <span className="text-3xl font-semibold">{dueDoses}</span> <span className="text-muted-foreground">due now</span>
                    </p>
                  )}
                </DashboardCard>
              ) : null}
              {incidentCounts ? (
                <DashboardCard title="Incidents" href="/portal/incidents" hrefLabel="See incidents">
                  {incidentCounts.open + incidentCounts.underReview === 0 ? (
                    <p className="text-muted-foreground">Nothing is waiting for review.</p>
                  ) : (
                    <p>
                      <span className="text-3xl font-semibold">{incidentCounts.open}</span> <span className="text-muted-foreground">open</span>
                      {" · "}
                      <span className="text-3xl font-semibold">{incidentCounts.underReview}</span> <span className="text-muted-foreground">under review</span>
                    </p>
                  )}
                </DashboardCard>
              ) : null}
              <DashboardCard title="Attendance below 90%">
                {overview.lowAttendance.length === 0 ? (
                  <p className="text-muted-foreground">Everyone is at 90% or more this school year.</p>
                ) : (
                  <ul className="space-y-2">
                    {overview.lowAttendance.map((entry) => (
                      <li key={entry.pupilId} className="flex items-baseline justify-between gap-3">
                        <Link href={`/portal/pupils/${entry.pupilId}/attendance`} className="underline underline-offset-4">
                          {entry.pupilName}
                        </Link>
                        <span className="font-medium">{entry.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>
            </div>
          </section>
        ) : null}

        {pupils.length === 0 ? (
          <p className="measure text-muted-foreground">{empty}</p>
        ) : (
          <section aria-labelledby="all-pupils" className="space-y-4">
            <h2 id="all-pupils" className="text-heading">
              {isParent ? "Your children" : "All pupils"}
            </h2>
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
          </section>
        )}
      </div>
    </>
  )
}
