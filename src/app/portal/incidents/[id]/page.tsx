import { PaperclipIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { z } from "zod"

import { DashboardCard, Facts } from "@/components/portal/dashboard-card"
import { DeleteIncidentButton } from "@/components/portal/incidents/delete-incident-button"
import { IncidentReviewForm } from "@/components/portal/incidents/incident-review-form"
import { PageHeader } from "@/components/site/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { recordAuditAfterResponse } from "@/lib/audit"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatLong, formatMedium, ukToday } from "@/lib/dates"
import { canEditIncident } from "@/lib/incidents/rules"
import { INCIDENT_STATUSES, INCIDENT_TYPES, INFORMED_HOW, INVOLVEMENT_ROLES, SEVERITIES, isInformedHow } from "@/lib/incidents/types"
import { getIncidentFor } from "@/lib/portal/incidents"
import { formatBytes } from "@/lib/uploads"

export const metadata: Metadata = { title: "Incident" }

function TextSection({ title, text }: { title: string; text: string | null }) {
  if (!text) return null
  return (
    <section>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-prose whitespace-pre-line">{text}</p>
    </section>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <DashboardCard title={title}>{children}</DashboardCard>
}

export default async function IncidentPage({ params }: PageProps<"/portal/incidents/[id]">) {
  const { id } = await params
  const user = await requireUser({ kind: "staff", permission: "incidents.view" })

  const incidentId = z.uuid().safeParse(id)
  const incident = incidentId.success ? await getIncidentFor(user, incidentId.data) : null
  if (!incident) notFound()

  recordAuditAfterResponse(user, { action: "view", subject: "incident", subjectId: incident.id, childId: incident.childId, summary: "Viewed an incident" })

  const informedHow = incident.parentsInformedHow && isInformedHow(incident.parentsInformedHow) ? INFORMED_HOW[incident.parentsInformedHow] : null
  const hasIntervention = incident.type === "physical_intervention"

  return (
    <>
      <PageHeader title={incident.summary}>
        <Link href={`/portal/pupils/${incident.childId}`} className="underline underline-offset-4">
          {incident.pupilName}
        </Link>
        {" · "}
        <time dateTime={incident.occurredOn}>{formatLong(incident.occurredOn)}</time>, {incident.occurredTime}
      </PageHeader>

      <div className="container-page grid gap-6 py-12 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{INCIDENT_TYPES[incident.type]}</Badge>
            <Badge variant={incident.severity === "high" ? "destructive" : "outline"}>{SEVERITIES[incident.severity]} severity</Badge>
            <Badge variant={incident.status === "closed" ? "secondary" : "default"}>{INCIDENT_STATUSES[incident.status]}</Badge>
            {incident.sharedWithParents ? <Badge variant="outline">Shared with parents</Badge> : null}
          </div>

          <Card title="What happened">
            <div className="space-y-5">
              <TextSection title="Description" text={incident.description} />
              <TextSection title="What led up to it" text={incident.antecedent} />
              <TextSection title="What the pupil did" text={incident.behaviour} />
              <TextSection title="How staff responded" text={incident.response} />
              <TextSection title="How it ended" text={incident.outcome} />
              <TextSection title="Injury" text={incident.injury} />
              <TextSection title="First aid given" text={incident.firstAid} />
            </div>
          </Card>

          {hasIntervention ? (
            <Card title="Physical intervention">
              <Facts
                items={[
                  { label: "Technique", value: incident.interventionTechnique ?? "Not recorded" },
                  { label: "Minutes", value: incident.interventionMinutes ?? "Not recorded" },
                  { label: "Staff involved", value: incident.interventionStaff ?? "Not recorded" },
                ]}
              />
              <div className="mt-5">
                <TextSection title="Debrief" text={incident.interventionDebrief} />
              </div>
            </Card>
          ) : null}

          <Card title="Parents informed">
            {incident.parentsInformedOn || incident.parentsInformedBy || informedHow ? (
              <Facts
                items={[
                  { label: "Date", value: incident.parentsInformedOn ? formatMedium(incident.parentsInformedOn) : "Not recorded" },
                  { label: "Told by", value: incident.parentsInformedBy ?? "Not recorded" },
                  { label: "How", value: informedHow ?? "Not recorded" },
                ]}
              />
            ) : (
              <p className="text-muted-foreground">Not recorded as told yet.</p>
            )}
          </Card>

          {incident.involved.length > 0 ? (
            <Card title="Other pupils">
              <ul className="space-y-1">
                {incident.involved.map((other) => (
                  <li key={other.childId}>
                    {other.pupilName} <span className="text-muted-foreground">({INVOLVEMENT_ROLES[other.role]})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Never shown to parents.</p>
            </Card>
          ) : null}

          {incident.files.length > 0 ? (
            <Card title="Attachments">
              <ul className="space-y-2">
                {incident.files.map((file) => (
                  <li key={file.id}>
                    <a href={`/portal/files/${file.id}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                      <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-severn" />
                      {file.filename}
                      <span className="text-sm text-muted-foreground no-underline">({formatBytes(file.sizeBytes)})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card title="Record">
            <Facts
              items={[
                { label: "Where", value: incident.location ?? "Not recorded" },
                { label: "Written up by", value: incident.createdByName ?? "A former member of staff" },
                {
                  label: "Signed off",
                  value: incident.reviewedAt ? `${incident.reviewedByName ?? "A former member of staff"}, ${formatMedium(ukToday(incident.reviewedAt))}` : "Not yet",
                },
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              {canEditIncident(user, { createdBy: incident.createdBy, status: incident.status }) ? (
                <Button asChild variant="outline">
                  <Link href={`/portal/incidents/${incident.id}/edit`}>Edit</Link>
                </Button>
              ) : null}
              {can(user, "incidents.review") ? (
                <DeleteIncidentButton incidentId={incident.id} summary={incident.summary} fileCount={incident.files.length} backHref="/portal/incidents" />
              ) : null}
            </div>
          </Card>

          {can(user, "incidents.review") ? (
            <Card title="Review">
              <IncidentReviewForm incident={incident} />
            </Card>
          ) : (
            <Card title="Review">
              {incident.reviewNotes ? <p className="whitespace-pre-line">{incident.reviewNotes}</p> : <p className="text-muted-foreground">No review notes.</p>}
              {incident.sharedWithParents ? <p className="mt-3 text-sm text-muted-foreground">A summary has been shared with parents.</p> : null}
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}
