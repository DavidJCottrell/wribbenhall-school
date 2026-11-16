import type { Metadata } from "next"
import Link from "next/link"
import { z } from "zod"

import { IncidentList } from "@/components/portal/incidents/incident-list"
import { PageHeader } from "@/components/site/page-header"
import { Button } from "@/components/ui/button"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { INCIDENT_STATUSES, INCIDENT_TYPES, isIncidentStatus, isIncidentType } from "@/lib/incidents/types"
import { listIncidentsFor } from "@/lib/portal/incidents"
import { listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Incidents" }

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-base"
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function IncidentsPage({ searchParams }: PageProps<"/portal/incidents">) {
  const user = await requireUser({ kind: "staff", permission: "incidents.view" })
  const query = await searchParams

  const status = first(query.status)
  const type = first(query.type)
  const pupil = z.uuid().safeParse(first(query.pupil))

  const [pupils, incidents] = await Promise.all([
    listPupilsFor(user),
    listIncidentsFor(user, {
      status: isIncidentStatus(status) ? status : undefined,
      type: isIncidentType(type) ? type : undefined,
      childId: pupil.success ? pupil.data : undefined,
      limit: 100,
    }),
  ])

  return (
    <>
      <PageHeader title="Incidents" />
      <div className="container-page space-y-8 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form method="get" className="grid flex-1 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="filter-status" className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select id="filter-status" name="status" defaultValue={isIncidentStatus(status) ? status : ""} className={selectClass}>
                <option value="">Any</option>
                {Object.entries(INCIDENT_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="mb-1 block text-sm font-medium">
                Type
              </label>
              <select id="filter-type" name="type" defaultValue={isIncidentType(type) ? type : ""} className={selectClass}>
                <option value="">Any</option>
                {Object.entries(INCIDENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-pupil" className="mb-1 block text-sm font-medium">
                Pupil
              </label>
              <select id="filter-pupil" name="pupil" defaultValue={pupil.success ? pupil.data : ""} className={selectClass}>
                <option value="">Anyone</option>
                {pupils.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {pupilDisplayName(entry)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit" variant="outline">
                Filter
              </Button>
              <Link href="/portal/incidents" className="py-2 underline underline-offset-4">
                Clear
              </Link>
            </div>
          </form>
          {can(user, "incidents.record") ? (
            <Button asChild>
              <Link href="/portal/incidents/new">Record an incident</Link>
            </Button>
          ) : null}
        </div>

        <IncidentList incidents={incidents} empty="No incidents match." />
        {incidents.length === 100 ? <p className="text-sm text-muted-foreground">Showing the latest 100. Use the filters to narrow it down.</p> : null}
      </div>
    </>
  )
}
