import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { PrintButton } from "@/components/portal/medical/print-button"
import { Badge } from "@/components/ui/badge"
import { recordAuditAfterResponse } from "@/lib/audit"
import { requireUser } from "@/lib/auth/session"
import { formatLong, formatMedium, ukToday } from "@/lib/dates"
import { CONDITION_KINDS, CONDITION_SEVERITIES, MEDICATION_ROUTES } from "@/lib/medical/types"
import { getEmergencySummary } from "@/lib/portal/medical"

export const metadata: Metadata = { title: "Emergency summary" }

export default async function EmergencySummaryPage({ params }: PageProps<"/portal/pupils/[id]/medical/emergency">) {
  const { id } = await params
  const user = await requireUser({ kind: "staff", permission: "medical.view" })

  const pupilId = z.uuid().safeParse(id)
  const summary = pupilId.success ? await getEmergencySummary(user, pupilId.data) : null
  if (!summary || !pupilId.success) notFound()

  recordAuditAfterResponse(user, { action: "view", subject: "medical", subjectId: pupilId.data, childId: pupilId.data, summary: "Viewed the emergency summary" })
  const today = ukToday()

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Emergency summary, printed {formatLong(today)}</p>
          <h1 className="text-title">{summary.pupilName}</h1>
          <p className="text-lead text-muted-foreground">
            {summary.yearGroup}
            {summary.dateOfBirth ? ` · Born ${formatMedium(summary.dateOfBirth)}` : ""}
          </p>
        </div>
        <PrintButton />
      </div>

      <section aria-labelledby="em-conditions">
        <h2 id="em-conditions" className="text-heading mb-3">
          Conditions, allergies and dietary needs
        </h2>
        {summary.conditions.length === 0 ? (
          <p>None recorded.</p>
        ) : (
          <ul className="space-y-4">
            {summary.conditions.map((condition) => (
              <li key={condition.id} className="break-inside-avoid rounded-lg border border-border p-4">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {condition.name}
                  <Badge variant="outline">{CONDITION_KINDS[condition.kind]}</Badge>
                  <Badge variant={condition.severity === "severe" ? "destructive" : "outline"}>{CONDITION_SEVERITIES[condition.severity]}</Badge>
                </p>
                {condition.signs ? <p className="mt-2 whitespace-pre-line"><span className="font-medium">Signs: </span>{condition.signs}</p> : null}
                {condition.actionPlan ? <p className="mt-1 whitespace-pre-line"><span className="font-medium">What to do: </span>{condition.actionPlan}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="em-medication">
        <h2 id="em-medication" className="text-heading mb-3">
          Medication
        </h2>
        {summary.medications.length === 0 ? (
          <p>None recorded.</p>
        ) : (
          <ul className="space-y-2">
            {summary.medications.map((medication) => (
              <li key={medication.id}>
                <span className="font-semibold">{medication.name}</span>, {medication.dose}, {MEDICATION_ROUTES[medication.route].toLowerCase()}
                {medication.asRequired ? ", only when needed" : `, at ${medication.scheduledTimes.join(", ")}`}
                {medication.storage ? ` · Kept: ${medication.storage}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="em-contacts">
        <h2 id="em-contacts" className="text-heading mb-3">
          Emergency contacts
        </h2>
        {summary.contacts.length === 0 ? (
          <p>No emergency contacts have been added.</p>
        ) : (
          <ul className="space-y-2">
            {summary.contacts.map((contact) => (
              <li key={contact.id}>
                <span className="font-semibold">{contact.name}</span> ({contact.relationship}) · {contact.phone ?? "No phone number"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
