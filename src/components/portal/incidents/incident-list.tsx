import { PendingLink } from "@/components/portal/pending-link"
import { Badge } from "@/components/ui/badge"
import { formatShort } from "@/lib/dates"
import { INCIDENT_STATUSES, INCIDENT_TYPES, SEVERITIES } from "@/lib/incidents/types"
import type { IncidentSummary } from "@/lib/portal/incidents"

type Props = { incidents: IncidentSummary[]; showPupil?: boolean; empty?: string }

export function IncidentList({ incidents, showPupil = true, empty = "There are no incidents to show." }: Props) {
  if (incidents.length === 0) return <p className="text-muted-foreground">{empty}</p>

  return (
    <ul className="stagger divide-y divide-border rounded-xl border border-border bg-card">
      {incidents.map((incident) => (
        <li key={incident.id} className="p-5">
          <p className="text-sm text-muted-foreground">
            <time dateTime={incident.occurredOn}>{formatShort(incident.occurredOn)}</time>, {incident.occurredTime}
            {showPupil ? ` · ${incident.pupilName}` : ""}
          </p>
          <p className="mt-1 text-lg font-semibold">
            <PendingLink href={`/portal/incidents/${incident.id}`} className="underline underline-offset-4">
              {incident.summary}
            </PendingLink>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{INCIDENT_TYPES[incident.type]}</Badge>
            <Badge variant={incident.severity === "high" ? "destructive" : "outline"}>{SEVERITIES[incident.severity]} severity</Badge>
            <Badge variant={incident.status === "closed" ? "secondary" : "default"}>{INCIDENT_STATUSES[incident.status]}</Badge>
            {incident.sharedWithParents ? <Badge variant="outline">Shared with parents</Badge> : null}
          </p>
        </li>
      ))}
    </ul>
  )
}
