import { TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CONDITION_SEVERITIES } from "@/lib/medical/types"
import type { AlertView } from "@/lib/portal/medical"

// Shown to every member of staff on every page about the pupil.
export function AlertStrip({ alerts }: { alerts: AlertView[] }) {
  if (alerts.length === 0) return null

  return (
    <section aria-label="Medical alerts" className="border-b border-destructive/40 bg-destructive/5">
      <div className="container-page py-4">
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex gap-3">
              <TriangleAlertIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-destructive" />
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {alert.name}
                  <Badge variant={alert.severity === "severe" ? "destructive" : "outline"}>{CONDITION_SEVERITIES[alert.severity]}</Badge>
                </p>
                {alert.signs ? <p className="mt-1 max-w-prose whitespace-pre-line text-sm">{alert.signs}</p> : null}
                {alert.actionPlan ? (
                  <p className="mt-1 max-w-prose whitespace-pre-line text-sm">
                    <span className="font-medium">What to do: </span>
                    {alert.actionPlan}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
