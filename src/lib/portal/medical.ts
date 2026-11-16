import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

import { getDb } from "@/db"
import { child, medicalCondition, medication, medicationLog, recordFile, user as userTable } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"
import { asRequiredAllowance, canAdminister, expiryState, scheduledDoses, type AdministerCheck, type DoseStatus, type ExpiryState } from "@/lib/medical/rules"
import {
  isConditionKind,
  isConditionSeverity,
  isDoseOutcome,
  isMedicationRoute,
  type ConditionKind,
  type ConditionSeverity,
  type DoseOutcome,
  type MedicationRoute,
} from "@/lib/medical/types"

import type { FileView } from "./files"
import { getPupilFor, listContactsFor, listPupilsFor, pupilDisplayName, type ContactView } from "./pupils"

export type AlertView = { id: string; kind: ConditionKind; name: string; severity: ConditionSeverity; signs: string | null; actionPlan: string | null }

export type ConditionView = AlertView & {
  alert: boolean
  active: boolean
  visibleToParents: boolean
  files: FileView[]
}

export type MedicationView = {
  id: string
  name: string
  dose: string
  route: MedicationRoute
  frequency: string | null
  scheduledTimes: string[]
  asRequired: boolean
  maxDailyDoses: number | null
  prescriber: string | null
  startsOn: string | null
  expiresOn: string | null
  storage: string | null
  consentOn: string | null
  notes: string | null
  active: boolean
}

export type LogEntryView = {
  id: string
  medicationId: string
  medicationName: string
  occurredOn: string
  occurredTime: string
  scheduledFor: string | null
  outcome: DoseOutcome
  dose: string | null
  givenBy: string | null
  givenByName: string
  witnessedByName: string | null
  notes: string | null
  voidedAt: Date | null
  voidedByName: string | null
  voidReason: string | null
}

export type MedicalRecord = { conditions: ConditionView[]; medications: MedicationView[]; log: LogEntryView[] }

// What a parent sees: the conditions and medication the school holds for their child. Not action plans, files, storage, prescriber, notes or the administration log.
export type ParentMedicalView = {
  conditions: { id: string; kind: ConditionKind; name: string; severity: ConditionSeverity }[]
  medications: { id: string; name: string; dose: string; route: MedicationRoute; frequency: string | null; scheduledTimes: string[]; asRequired: boolean }[]
}

const canViewMedical = (user: CurrentUser) => can(user, "medical.view")

type ConditionRow = {
  id: string
  kind: string
  name: string
  severity: string
  signs: string | null
  actionPlan: string | null
  alert: boolean
  active: boolean
  visibleToParents: boolean
}

function toCondition(row: ConditionRow, files: FileView[]): ConditionView | null {
  if (!isConditionKind(row.kind) || !isConditionSeverity(row.severity)) return null
  return { ...row, kind: row.kind, severity: row.severity, files }
}

const conditionColumns = {
  id: medicalCondition.id,
  kind: medicalCondition.kind,
  name: medicalCondition.name,
  severity: medicalCondition.severity,
  signs: medicalCondition.signs,
  actionPlan: medicalCondition.actionPlan,
  alert: medicalCondition.alert,
  active: medicalCondition.active,
  visibleToParents: medicalCondition.visibleToParents,
}

const medicationColumns = {
  id: medication.id,
  name: medication.name,
  dose: medication.dose,
  route: medication.route,
  frequency: medication.frequency,
  scheduledTimes: medication.scheduledTimes,
  asRequired: medication.asRequired,
  maxDailyDoses: medication.maxDailyDoses,
  prescriber: medication.prescriber,
  startsOn: medication.startsOn,
  expiresOn: medication.expiresOn,
  storage: medication.storage,
  consentOn: medication.consentOn,
  notes: medication.notes,
  active: medication.active,
}

type MedicationRow = Omit<MedicationView, "route"> & { route: string }

const toMedication = (row: MedicationRow): MedicationView | null => (isMedicationRoute(row.route) ? { ...row, route: row.route } : null)

// Every member of staff sees a pupil's active alerts, because anyone supervising a child needs to know. To be confirmed with the school.
export async function listAlertsFor(user: CurrentUser, childId: string): Promise<AlertView[]> {
  if (user.kind !== "staff" || !(await getPupilFor(user, childId))) return []

  const rows = await getDb()
    .select(conditionColumns)
    .from(medicalCondition)
    .where(and(eq(medicalCondition.childId, childId), eq(medicalCondition.alert, true), eq(medicalCondition.active, true)))
    .orderBy(asc(medicalCondition.name))
  return rows.flatMap((row) => toCondition(row, []) ?? []).map(({ id, kind, name, severity, signs, actionPlan }) => ({ id, kind, name, severity, signs, actionPlan }))
}

const LOG_PAGE = 40

export async function getMedicalFor(user: CurrentUser, childId: string): Promise<MedicalRecord | null> {
  if (!canViewMedical(user) || !(await getPupilFor(user, childId))) return null

  const db = getDb()
  const [conditionRows, medicationRows, logRows] = await Promise.all([
    db.select(conditionColumns).from(medicalCondition).where(eq(medicalCondition.childId, childId)).orderBy(desc(medicalCondition.active), asc(medicalCondition.name)),
    db.select(medicationColumns).from(medication).where(eq(medication.childId, childId)).orderBy(desc(medication.active), asc(medication.name)),
    db
      .select({
        id: medicationLog.id,
        medicationId: medicationLog.medicationId,
        medicationName: medication.name,
        occurredOn: medicationLog.occurredOn,
        occurredTime: medicationLog.occurredTime,
        scheduledFor: medicationLog.scheduledFor,
        outcome: medicationLog.outcome,
        dose: medicationLog.dose,
        givenBy: medicationLog.givenBy,
        givenByName: medicationLog.givenByName,
        witnessedByName: medicationLog.witnessedByName,
        notes: medicationLog.notes,
        voidedAt: medicationLog.voidedAt,
        voidedByName: medicationLog.voidedByName,
        voidReason: medicationLog.voidReason,
      })
      .from(medicationLog)
      .innerJoin(medication, eq(medication.id, medicationLog.medicationId))
      .where(eq(medicationLog.childId, childId))
      .orderBy(desc(medicationLog.occurredOn), desc(medicationLog.occurredTime), desc(medicationLog.recordedAt))
      .limit(LOG_PAGE),
  ])

  const files = conditionRows.length
    ? await db
        .select({ id: recordFile.id, conditionId: recordFile.medicalConditionId, filename: recordFile.filename, contentType: recordFile.contentType, sizeBytes: recordFile.sizeBytes })
        .from(recordFile)
        .where(inArray(recordFile.medicalConditionId, conditionRows.map((row) => row.id)))
        .orderBy(asc(recordFile.createdAt))
    : []

  return {
    conditions: conditionRows.flatMap((row) => toCondition(row, files.filter((file) => file.conditionId === row.id)) ?? []),
    medications: medicationRows.flatMap((row) => toMedication(row) ?? []),
    log: logRows.flatMap((row) => (isDoseOutcome(row.outcome) ? [{ ...row, outcome: row.outcome }] : [])),
  }
}

export async function getParentMedicalFor(user: CurrentUser, childId: string): Promise<ParentMedicalView | null> {
  if (user.kind !== "parent" || !(await getPupilFor(user, childId))) return null

  const db = getDb()
  const [conditionRows, medicationRows] = await Promise.all([
    db
      .select({ id: medicalCondition.id, kind: medicalCondition.kind, name: medicalCondition.name, severity: medicalCondition.severity })
      .from(medicalCondition)
      .where(and(eq(medicalCondition.childId, childId), eq(medicalCondition.active, true), eq(medicalCondition.visibleToParents, true)))
      .orderBy(asc(medicalCondition.name)),
    db
      .select({
        id: medication.id,
        name: medication.name,
        dose: medication.dose,
        route: medication.route,
        frequency: medication.frequency,
        scheduledTimes: medication.scheduledTimes,
        asRequired: medication.asRequired,
      })
      .from(medication)
      .where(and(eq(medication.childId, childId), eq(medication.active, true)))
      .orderBy(asc(medication.name)),
  ])

  return {
    conditions: conditionRows.flatMap((row) => (isConditionKind(row.kind) && isConditionSeverity(row.severity) ? [{ ...row, kind: row.kind, severity: row.severity }] : [])),
    medications: medicationRows.flatMap((row) => (isMedicationRoute(row.route) ? [{ ...row, route: row.route }] : [])),
  }
}

export type TodayDose = { time: string; status: DoseStatus }

export type TodayMedication = {
  medicationId: string
  pupilId: string
  pupilName: string
  name: string
  dose: string
  route: MedicationRoute
  asRequired: boolean
  doses: TodayDose[]
  givenToday: number
  lastGivenAt: string | null
  allowance: { reached: boolean; remaining: number | null }
  expiry: ExpiryState
  expiresOn: string | null
  administer: AdministerCheck
}

// The medication round for today across every current pupil. Voided entries are ignored.
export async function getTodayMedical(user: CurrentUser, today: string, nowTime: string): Promise<TodayMedication[] | null> {
  if (!canViewMedical(user)) return null

  const pupils = await listPupilsFor(user)
  if (pupils.length === 0) return []
  const pupilName = new Map(pupils.map((pupil) => [pupil.id, pupilDisplayName(pupil)]))

  const db = getDb()
  const rows = await db
    .select({ ...medicationColumns, childId: medication.childId })
    .from(medication)
    .where(and(eq(medication.active, true), inArray(medication.childId, pupils.map((pupil) => pupil.id))))
    .orderBy(asc(medication.name))
  if (rows.length === 0) return []

  const logs = await db
    .select({ medicationId: medicationLog.medicationId, scheduledFor: medicationLog.scheduledFor, outcome: medicationLog.outcome, occurredTime: medicationLog.occurredTime })
    .from(medicationLog)
    .where(and(eq(medicationLog.occurredOn, today), isNull(medicationLog.voidedAt), inArray(medicationLog.medicationId, rows.map((row) => row.id))))
    .orderBy(asc(medicationLog.occurredTime))

  const result = rows.flatMap((row) => {
    const med = toMedication(row)
    const name = pupilName.get(row.childId)
    if (!med || !name) return []

    const entries = logs.filter((log) => log.medicationId === med.id && isDoseOutcome(log.outcome)).map((log) => ({ ...log, outcome: log.outcome as DoseOutcome }))
    const given = entries.filter((entry) => entry.outcome === "given")
    return [
      {
        medicationId: med.id,
        pupilId: row.childId,
        pupilName: name,
        name: med.name,
        dose: med.dose,
        route: med.route,
        asRequired: med.asRequired,
        doses: med.asRequired ? [] : scheduledDoses(med.scheduledTimes, entries, nowTime),
        givenToday: given.length,
        lastGivenAt: given.at(-1)?.occurredTime ?? null,
        allowance: asRequiredAllowance(med.maxDailyDoses, given.length),
        expiry: expiryState(med.expiresOn, today),
        expiresOn: med.expiresOn,
        administer: canAdminister(med, today),
      },
    ]
  })

  return result.sort((a, b) => a.pupilName.localeCompare(b.pupilName) || a.name.localeCompare(b.name))
}

export type EmergencySummary = {
  pupilName: string
  yearGroup: string
  dateOfBirth: string | null
  conditions: AlertView[]
  medications: Pick<MedicationView, "id" | "name" | "dose" | "route" | "frequency" | "scheduledTimes" | "asRequired" | "storage">[]
  contacts: ContactView[]
}

// Everything someone needs in an emergency, on one page. Active records only.
export async function getEmergencySummary(user: CurrentUser, childId: string): Promise<EmergencySummary | null> {
  if (!canViewMedical(user)) return null
  const pupil = await getPupilFor(user, childId)
  if (!pupil) return null

  const [record, contacts] = await Promise.all([getMedicalFor(user, childId), listContactsFor(user, childId)])
  if (!record) return null

  return {
    pupilName: pupilDisplayName(pupil),
    yearGroup: pupil.yearGroup,
    dateOfBirth: (await getDb().select({ dateOfBirth: child.dateOfBirth }).from(child).where(eq(child.id, childId)))[0]?.dateOfBirth ?? null,
    conditions: record.conditions
      .filter((condition) => condition.active)
      .sort((a, b) => Number(b.alert) - Number(a.alert))
      .map(({ id, kind, name, severity, signs, actionPlan }) => ({ id, kind, name, severity, signs, actionPlan })),
    medications: record.medications
      .filter((med) => med.active)
      .map(({ id, name, dose, route, frequency, scheduledTimes, asRequired, storage }) => ({ id, name, dose, route, frequency, scheduledTimes, asRequired, storage })),
    contacts: contacts.filter((contact) => contact.emergencyContact),
  }
}

// Other staff who could witness a dose. Names only.
export async function listWitnessOptions(user: CurrentUser): Promise<{ id: string; name: string }[]> {
  if (!can(user, "medical.record")) return []
  const rows = await getDb()
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .where(and(eq(userTable.role, "staff"), eq(userTable.banned, false)))
    .orderBy(asc(userTable.name))
  return rows.filter((row) => row.id !== user.id)
}
