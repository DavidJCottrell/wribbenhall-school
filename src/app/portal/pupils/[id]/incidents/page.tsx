import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { IncidentList } from "@/components/portal/incidents/incident-list"
import { SharedIncidentList } from "@/components/portal/incidents/shared-incident-list"
import { Button } from "@/components/ui/button"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { listIncidentsFor, listSharedIncidentsFor } from "@/lib/portal/incidents"
import { getPupilFor } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Incidents" }

export default async function PupilIncidentsPage({ params }: PageProps<"/portal/pupils/[id]/incidents">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  const pupil = pupilId.success ? await getPupilFor(user, pupilId.data) : null
  if (!pupil) notFound()

  if (user.kind === "parent") {
    const shared = await listSharedIncidentsFor(user, pupil.id)
    return (
      <div className="container-page max-w-3xl py-10">
        <h2 className="text-heading mb-6">Incident notices</h2>
        <SharedIncidentList incidents={shared} />
      </div>
    )
  }

  // Staff without incident access see the same "not found" as any page they can't use.
  if (!can(user, "incidents.view")) notFound()

  const incidents = await listIncidentsFor(user, { childId: pupil.id })

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-heading">Incidents</h2>
        {can(user, "incidents.record") ? (
          <Button asChild>
            <Link href={`/portal/incidents/new?pupil=${pupil.id}`}>Record an incident</Link>
          </Button>
        ) : null}
      </div>
      <IncidentList incidents={incidents} showPupil={false} empty="No incidents have been recorded." />
    </div>
  )
}
