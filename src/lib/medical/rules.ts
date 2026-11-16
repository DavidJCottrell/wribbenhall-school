import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

import type { DoseOutcome } from "./types"

// How long after the scheduled time a dose still counts as "due" rather than "overdue".
export const OVERDUE_AFTER_MINUTES = 60
export const EXPIRY_WARNING_DAYS = 30

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

type MedicationDates = { active: boolean; startsOn: string | null; expiresOn: string | null; consentOn: string | null }

export type ExpiryState = "none" | "ok" | "soon" | "expired"

export function expiryState(expiresOn: string | null, today: string): ExpiryState {
  if (!expiresOn) return "none"
  if (expiresOn < today) return "expired"
  const days = (Date.parse(expiresOn) - Date.parse(today)) / 86_400_000
  return days <= EXPIRY_WARNING_DAYS ? "soon" : "ok"
}

export type AdministerCheck = { ok: true } | { ok: false; reason: string }

// Medication is only given when it is active, in date, started, and the parents have consented.
export function canAdminister(medication: MedicationDates, today: string): AdministerCheck {
  if (!medication.active) return { ok: false, reason: "This medication is no longer active." }
  if (!medication.consentOn) return { ok: false, reason: "Parental consent hasn't been recorded for this medication." }
  if (medication.startsOn && medication.startsOn > today) return { ok: false, reason: "This medication hasn't started yet." }
  if (expiryState(medication.expiresOn, today) === "expired") return { ok: false, reason: "This medication has expired." }
  return { ok: true }
}

export type DoseStatus = DoseOutcome | "due" | "upcoming" | "overdue"

type LoggedDose = { scheduledFor: string | null; outcome: DoseOutcome }

// One row per scheduled time for today. A dose with an entry shows what happened. One without is upcoming, due or overdue.
export function scheduledDoses(times: readonly string[], logs: readonly LoggedDose[], nowTime: string) {
  const now = toMinutes(nowTime)
  return [...times].sort().map((time) => {
    const entry = logs.find((log) => log.scheduledFor === time)
    const minutes = toMinutes(time)
    let status: DoseStatus
    if (entry) status = entry.outcome
    else if (now < minutes - OVERDUE_AFTER_MINUTES) status = "upcoming"
    else if (now <= minutes + OVERDUE_AFTER_MINUTES) status = "due"
    else status = "overdue"
    return { time, status }
  })
}

// As-required medication has a daily limit. Counts only doses that were given and not voided.
export function asRequiredAllowance(maxDailyDoses: number | null, givenToday: number) {
  if (maxDailyDoses === null) return { reached: false, remaining: null }
  return { reached: givenToday >= maxDailyDoses, remaining: Math.max(0, maxDailyDoses - givenToday) }
}

// Outcomes that make sense for the kind of medication. Nobody "misses" a dose that is only given when needed.
export function allowedOutcomes(asRequired: boolean): DoseOutcome[] {
  return asRequired ? ["given", "refused"] : ["given", "refused", "missed", "not_needed"]
}

type VoidableEntry = { givenBy: string | null; voidedAt: Date | null }

// Entries are never edited. A mistake is voided with a reason, by whoever recorded it or by someone who manages medical records.
export function canVoidEntry(user: Pick<CurrentUser, "id" | "kind" | "permissions">, entry: VoidableEntry) {
  if (entry.voidedAt) return false
  if (can(user, "medical.manage")) return true
  return can(user, "medical.record") && entry.givenBy === user.id
}
