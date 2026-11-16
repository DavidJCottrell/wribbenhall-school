import type { Metadata } from "next"
import Link from "next/link"

import { DoseDialog } from "@/components/portal/medical/dose-dialog"
import { PageHeader } from "@/components/site/page-header"
import { Badge } from "@/components/ui/badge"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatLong, formatMedium, ukNowTime, ukToday } from "@/lib/dates"
import { DOSE_OUTCOMES, MEDICATION_ROUTES } from "@/lib/medical/types"
import type { DoseStatus } from "@/lib/medical/rules"
import { getTodayMedical, listWitnessOptions, type TodayMedication } from "@/lib/portal/medical"

export const metadata: Metadata = { title: "Medication today" }

const statusLabel = (status: DoseStatus) => (status === "due" ? "Due now" : status === "upcoming" ? "Later" : status === "overdue" ? "Overdue" : DOSE_OUTCOMES[status])
const statusVariant = (status: DoseStatus) => (status === "overdue" ? "destructive" : status === "due" ? "default" : status === "given" ? "secondary" : "outline")

function attentionReasons(item: TodayMedication) {
  const reasons: string[] = []
  if (!item.administer.ok) reasons.push(item.administer.reason)
  else if (item.expiry === "soon" && item.expiresOn) reasons.push(`Expires ${formatMedium(item.expiresOn)}.`)
  return reasons
}

export default async function MedicationTodayPage() {
  const user = await requireUser({ kind: "staff", permission: "medical.view" })
  const today = ukToday()

  const [items, witnesses] = await Promise.all([getTodayMedical(user, today, ukNowTime()), listWitnessOptions(user)])
  const rows = items ?? []
  const canRecord = can(user, "medical.record")
  const needAttention = rows.filter((item) => attentionReasons(item).length > 0)

  return (
    <>
      <PageHeader title="Medication today">{formatLong(today)}</PageHeader>
      <div className="container-page max-w-4xl space-y-10 py-12">
        {needAttention.length > 0 ? (
          <section aria-labelledby="attention" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 id="attention" className="mb-3 text-xl font-semibold">
              Needs attention
            </h2>
            <ul className="space-y-2">
              {needAttention.map((item) => (
                <li key={item.medicationId}>
                  <Link href={`/portal/pupils/${item.pupilId}/medical`} className="font-medium underline underline-offset-4">
                    {item.pupilName}, {item.name}
                  </Link>
                  : {attentionReasons(item).join(" ")}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {rows.length === 0 ? <p className="text-muted-foreground">No current medication is recorded for any pupil.</p> : null}

        <ul className="stagger space-y-4">
          {rows.map((item) => {
            const medication = { id: item.medicationId, name: item.name, dose: item.dose, asRequired: item.asRequired, scheduledTimes: item.doses.map((dose) => dose.time) }
            const blockedReason = item.administer.ok ? null : item.administer.reason
            return (
              <li key={item.medicationId} className="rounded-xl border border-border bg-card p-6">
                <p className="text-lg font-semibold">
                  <Link href={`/portal/pupils/${item.pupilId}/medical`} className="underline underline-offset-4">
                    {item.pupilName}
                  </Link>
                  : {item.name}
                </p>
                <p className="text-muted-foreground">
                  {item.dose}, {MEDICATION_ROUTES[item.route].toLowerCase()}
                </p>
                {item.asRequired ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p>
                      Given {item.givenToday} {item.givenToday === 1 ? "time" : "times"} today
                      {item.lastGivenAt ? `, last at ${item.lastGivenAt}` : ""}
                      {item.allowance.remaining !== null ? ` · ${item.allowance.remaining} left today` : ""}
                    </p>
                    {canRecord ? (
                      <DoseDialog medication={medication} pupilName={item.pupilName} witnesses={witnesses} blockedReason={item.allowance.reached ? "The daily maximum has been reached." : blockedReason} />
                    ) : null}
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {item.doses.map((dose) => (
                      <li key={dose.time} className="flex flex-wrap items-center gap-3">
                        <span className="w-14 font-medium">{dose.time}</span>
                        <Badge variant={statusVariant(dose.status)}>{statusLabel(dose.status)}</Badge>
                        {canRecord && (dose.status === "upcoming" || dose.status === "due" || dose.status === "overdue") ? (
                          <DoseDialog medication={medication} pupilName={item.pupilName} scheduledFor={dose.time} witnesses={witnesses} blockedReason={blockedReason} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
