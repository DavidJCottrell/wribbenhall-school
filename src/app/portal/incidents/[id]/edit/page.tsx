import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { IncidentForm } from "@/components/portal/incidents/incident-form"
import { BackLink } from "@/components/portal/back-link"
import { PageHeader } from "@/components/site/page-header"
import { requireUser } from "@/lib/auth/session"
import { canEditIncident } from "@/lib/incidents/rules"
import { getIncidentFor } from "@/lib/portal/incidents"
import { listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Edit incident" }

export default async function EditIncidentPage({ params }: PageProps<"/portal/incidents/[id]/edit">) {
  const { id } = await params
  const user = await requireUser({ kind: "staff", permission: "incidents.record" })

  const incidentId = z.uuid().safeParse(id)
  const incident = incidentId.success ? await getIncidentFor(user, incidentId.data) : null
  if (!incident || !canEditIncident(user, { createdBy: incident.createdBy, status: incident.status })) notFound()

  const others = (await listPupilsFor(user)).filter((entry) => entry.id !== incident.childId)

  return (
    <>
      <PageHeader title="Edit incident" eyebrow={<BackLink href={`/portal/incidents/${incident.id}`}>Back to the incident</BackLink>}>About {incident.pupilName}</PageHeader>
      <div className="container-page max-w-3xl py-12">
        <IncidentForm
          pupil={{ id: incident.childId, name: incident.pupilName }}
          otherPupils={others.map((entry) => ({ id: entry.id, name: pupilDisplayName(entry) }))}
          incident={incident}
        />
      </div>
    </>
  )
}
