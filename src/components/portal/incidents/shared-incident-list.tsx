import { formatLong } from "@/lib/dates"
import { INCIDENT_TYPES } from "@/lib/incidents/types"
import type { SharedIncident } from "@/lib/portal/incidents"

export function SharedIncidentList({ incidents }: { incidents: SharedIncident[] }) {
  if (incidents.length === 0) return <p className="text-muted-foreground">The school hasn&apos;t shared any incident notices with you.</p>

  return (
    <ol className="stagger space-y-4">
      {incidents.map((incident) => (
        <li key={incident.id} className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-lg font-semibold">{INCIDENT_TYPES[incident.type]}</h3>
            <time dateTime={incident.occurredOn} className="text-muted-foreground">
              {formatLong(incident.occurredOn)}
            </time>
          </div>
          <p className="mt-3 max-w-prose whitespace-pre-line">{incident.parentSummary}</p>
        </li>
      ))}
    </ol>
  )
}
