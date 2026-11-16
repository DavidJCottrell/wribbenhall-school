import { CONDITION_KINDS, CONDITION_SEVERITIES, MEDICATION_ROUTES } from "@/lib/medical/types"
import type { ParentMedicalView } from "@/lib/portal/medical"

export function ParentMedical({ view }: { view: ParentMedicalView }) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="parent-conditions">
        <h2 id="parent-conditions" className="text-heading mb-4">
          Conditions, allergies and dietary needs
        </h2>
        {view.conditions.length === 0 ? (
          <p className="text-muted-foreground">The school has nothing recorded to show here. Please tell the office about anything we should know.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {view.conditions.map((condition) => (
              <li key={condition.id} className="p-4">
                <p className="font-semibold">{condition.name}</p>
                <p className="text-sm text-muted-foreground">
                  {CONDITION_KINDS[condition.kind]} · {CONDITION_SEVERITIES[condition.severity]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="parent-medication">
        <h2 id="parent-medication" className="text-heading mb-4">
          Medication the school gives
        </h2>
        {view.medications.length === 0 ? (
          <p className="text-muted-foreground">The school isn&apos;t giving any medication.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {view.medications.map((medication) => (
              <li key={medication.id} className="p-4">
                <p className="font-semibold">{medication.name}</p>
                <p className="text-sm text-muted-foreground">
                  {medication.dose}, {MEDICATION_ROUTES[medication.route].toLowerCase()}
                  {medication.asRequired ? ", only when needed" : `, at ${medication.scheduledTimes.join(", ")}`}
                  {medication.frequency ? ` · ${medication.frequency}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
