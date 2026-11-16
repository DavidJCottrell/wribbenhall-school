import { PaperclipIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"
import { formatMedium } from "@/lib/dates"
import { canAdminister, canVoidEntry, expiryState } from "@/lib/medical/rules"
import { CONDITION_KINDS, CONDITION_SEVERITIES, DOSE_OUTCOMES, MEDICATION_ROUTES } from "@/lib/medical/types"
import type { MedicalRecord, MedicationView } from "@/lib/portal/medical"
import { formatBytes } from "@/lib/uploads"

import { ConditionDialog } from "./condition-dialog"
import { DoseDialog, VoidDoseButton } from "./dose-dialog"
import { MedicationDialog } from "./medication-dialog"

type Props = {
  pupil: { id: string; name: string }
  record: MedicalRecord
  user: CurrentUser
  today: string
  witnesses: { id: string; name: string }[]
}

function MedicationStatus({ medication, today }: { medication: MedicationView; today: string }) {
  const expiry = expiryState(medication.expiresOn, today)
  return (
    <>
      {!medication.active ? <Badge variant="secondary">No longer current</Badge> : null}
      {medication.active && !medication.consentOn ? <Badge variant="destructive">No parental consent recorded</Badge> : null}
      {expiry === "expired" ? <Badge variant="destructive">Expired {formatMedium(medication.expiresOn!)}</Badge> : null}
      {expiry === "soon" ? <Badge variant="outline">Expires {formatMedium(medication.expiresOn!)}</Badge> : null}
    </>
  )
}

export function MedicalPanel({ pupil, record, user, today, witnesses }: Props) {
  const canManage = can(user, "medical.manage")
  const canRecord = can(user, "medical.record")

  return (
    <div className="stagger space-y-12">
      <section aria-labelledby="conditions" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="conditions" className="text-heading">
            Conditions, allergies and dietary needs
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/portal/pupils/${pupil.id}/medical/emergency`}>Emergency summary</Link>
          </Button>
        </div>
        {record.conditions.length === 0 ? <p className="text-muted-foreground">Nothing has been recorded.</p> : null}
        <ul className="stagger space-y-4">
          {record.conditions.map((condition) => (
            <li key={condition.id} className="rounded-xl border border-border bg-card p-6">
              <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                {condition.name}
                <Badge variant="outline">{CONDITION_KINDS[condition.kind]}</Badge>
                <Badge variant={condition.severity === "severe" ? "destructive" : "outline"}>{CONDITION_SEVERITIES[condition.severity]}</Badge>
                {condition.alert ? <Badge variant="destructive">Alert for all staff</Badge> : null}
                {!condition.active ? <Badge variant="secondary">No longer current</Badge> : null}
                {!condition.visibleToParents ? <Badge variant="outline">Not shown to parents</Badge> : null}
              </p>
              {condition.signs ? <p className="mt-3 max-w-prose whitespace-pre-line"><span className="font-medium">Signs: </span>{condition.signs}</p> : null}
              {condition.actionPlan ? <p className="mt-2 max-w-prose whitespace-pre-line"><span className="font-medium">Action plan: </span>{condition.actionPlan}</p> : null}
              {condition.files.length > 0 ? (
                <ul aria-label="Attachments" className="mt-3 space-y-1">
                  {condition.files.map((file) => (
                    <li key={file.id}>
                      <a href={`/portal/files/${file.id}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                        <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-severn" />
                        {file.filename} <span className="text-sm text-muted-foreground no-underline">({formatBytes(file.sizeBytes)})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canManage ? (
                <div className="mt-4">
                  <ConditionDialog childId={pupil.id} condition={condition} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {canManage ? <ConditionDialog childId={pupil.id} /> : null}
      </section>

      <section aria-labelledby="medication" className="space-y-4">
        <h2 id="medication" className="text-heading">
          Medication
        </h2>
        {record.medications.length === 0 ? <p className="text-muted-foreground">No medication has been recorded.</p> : null}
        <ul className="stagger space-y-4">
          {record.medications.map((medication) => {
            const check = canAdminister(medication, today)
            return (
              <li key={medication.id} className="rounded-xl border border-border bg-card p-6">
                <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {medication.name}
                  <MedicationStatus medication={medication} today={today} />
                </p>
                <p className="mt-1">
                  {medication.dose}, {MEDICATION_ROUTES[medication.route].toLowerCase()}
                  {medication.asRequired
                    ? `, only when needed${medication.maxDailyDoses ? ` (up to ${medication.maxDailyDoses} a day)` : ""}`
                    : `, at ${medication.scheduledTimes.join(", ")}`}
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {medication.frequency ? <div><dt className="text-muted-foreground">Frequency</dt><dd>{medication.frequency}</dd></div> : null}
                  <div><dt className="text-muted-foreground">Parental consent</dt><dd>{medication.consentOn ? formatMedium(medication.consentOn) : "Not recorded"}</dd></div>
                  {medication.prescriber ? <div><dt className="text-muted-foreground">Prescriber</dt><dd>{medication.prescriber}</dd></div> : null}
                  {medication.storage ? <div><dt className="text-muted-foreground">Kept</dt><dd>{medication.storage}</dd></div> : null}
                  {medication.startsOn ? <div><dt className="text-muted-foreground">Starts</dt><dd>{formatMedium(medication.startsOn)}</dd></div> : null}
                  {medication.expiresOn ? <div><dt className="text-muted-foreground">Expires</dt><dd>{formatMedium(medication.expiresOn)}</dd></div> : null}
                </dl>
                {medication.notes ? <p className="mt-3 max-w-prose whitespace-pre-line text-sm">{medication.notes}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  {canRecord && medication.active ? (
                    <DoseDialog
                      medication={medication}
                      pupilName={pupil.name}
                      witnesses={witnesses}
                      blockedReason={check.ok ? null : check.reason}
                      label="Record an entry"
                    />
                  ) : null}
                  {canManage ? <MedicationDialog childId={pupil.id} medication={medication} /> : null}
                </div>
              </li>
            )
          })}
        </ul>
        {canManage ? <MedicationDialog childId={pupil.id} /> : null}
      </section>

      <section aria-labelledby="log" className="space-y-4">
        <h2 id="log" className="text-heading">
          Administration log
        </h2>
        <p className="text-muted-foreground">The latest {record.log.length} entries. Entries are never edited. A mistake is voided with a reason and stays on record.</p>
        {record.log.length === 0 ? <p className="text-muted-foreground">Nothing has been recorded yet.</p> : null}
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {record.log.map((entry) => {
            const summary = `${entry.medicationName}, ${DOSE_OUTCOMES[entry.outcome].toLowerCase()} at ${entry.occurredTime} on ${formatMedium(entry.occurredOn)}`
            return (
              <li key={entry.id} className="p-4">
                <p className={entry.voidedAt ? "text-muted-foreground line-through" : "font-medium"}>{summary}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.dose ? `${entry.dose} · ` : ""}
                  {entry.scheduledFor ? `Scheduled ${entry.scheduledFor} · ` : ""}
                  By {entry.givenByName}
                  {entry.witnessedByName ? `, witnessed by ${entry.witnessedByName}` : ""}
                </p>
                {entry.notes ? <p className="mt-1 text-sm">{entry.notes}</p> : null}
                {entry.voidedAt ? (
                  <p className="mt-1 text-sm">
                    <Badge variant="destructive">Voided</Badge> by {entry.voidedByName ?? "a former member of staff"}: {entry.voidReason}
                  </p>
                ) : canVoidEntry(user, entry) ? (
                  <div className="mt-1">
                    <VoidDoseButton logId={entry.id} description={summary} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
