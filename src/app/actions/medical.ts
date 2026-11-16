"use server"

import { and, count, eq, inArray, isNull } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { medicalCondition, medication, medicationLog, recordFile, user as userTable } from "@/db/schema"
import { recordAudit } from "@/lib/audit"
import { getActionUser } from "@/lib/auth/session"
import { isUniqueViolation } from "@/lib/db-errors"
import { ukNowTime, ukToday } from "@/lib/dates"
import { conditionSchema, doseSchema, medicationSchema, parseTimes, voidDoseSchema, type ConditionValues, type MedicationValues } from "@/lib/forms/schemas"
import { allowedOutcomes, asRequiredAllowance, canAdminister, canVoidEntry } from "@/lib/medical/rules"
import { discardBlobs, verifyUploads, type VerifiedUpload } from "@/lib/portal/file-uploads"
import { getPupilFor } from "@/lib/portal/pupils"
import { MAX_FILES_PER_RECORD } from "@/lib/uploads"

export type MedicalResult = { ok: true; id?: string } | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

const checkAnswers = "Some answers need checking. Correct the highlighted fields and save again."
const filesProblem = "One of the files isn't allowed or didn't finish uploading. Please choose it again."
const pupilNotFound = { ok: false, message: "That pupil could not be found." } as const
const recordNotFound = { ok: false, message: "That record could not be found." } as const

const orNull = (value: string) => value || null

function conditionFields(values: ConditionValues) {
  return { ...values, signs: orNull(values.signs), actionPlan: orNull(values.actionPlan) }
}

function medicationFields(values: MedicationValues) {
  return {
    name: values.name,
    dose: values.dose,
    route: values.route,
    frequency: orNull(values.frequency),
    scheduledTimes: values.asRequired ? [] : [...new Set(parseTimes(values.scheduledTimes))].sort(),
    asRequired: values.asRequired,
    maxDailyDoses: values.asRequired && values.maxDailyDoses ? Number(values.maxDailyDoses) : null,
    prescriber: orNull(values.prescriber),
    startsOn: orNull(values.startsOn),
    expiresOn: orNull(values.expiresOn),
    storage: orNull(values.storage),
    consentOn: orNull(values.consentOn),
    notes: orNull(values.notes),
    active: values.active,
  }
}

export async function saveCondition(childId: unknown, conditionId: unknown, values: unknown, uploads?: unknown, removedFileIds?: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.manage")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getPupilFor(user, parsedChildId.data))) return pupilNotFound

  const parsed = conditionSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }

  const db = getDb()
  const editing = conditionId !== null && conditionId !== undefined
  const parsedId = editing ? z.uuid().safeParse(conditionId) : null
  if (parsedId && !parsedId.success) return recordNotFound

  const id = parsedId?.success ? parsedId.data : crypto.randomUUID()
  if (editing) {
    const [row] = await db.select({ id: medicalCondition.id }).from(medicalCondition).where(and(eq(medicalCondition.id, id), eq(medicalCondition.childId, parsedChildId.data)))
    if (!row) return recordNotFound
  }

  const removedIds = z.array(z.uuid()).max(MAX_FILES_PER_RECORD).safeParse(removedFileIds ?? [])
  if (!removedIds.success) return { ok: false, message: "That change couldn't be saved. Please try again." }

  const existing = editing ? await db.select({ id: recordFile.id, pathname: recordFile.pathname }).from(recordFile).where(eq(recordFile.medicalConditionId, id)) : []
  const removing = existing.filter((file) => removedIds.data.includes(file.id))

  let verified: VerifiedUpload[] | null
  try {
    verified = await verifyUploads(parsedChildId.data, uploads)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: filesProblem }

  if (existing.length - removing.length + verified.length > MAX_FILES_PER_RECORD) {
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: `A record can have up to ${MAX_FILES_PER_RECORD} files.` }
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    editing
      ? db.update(medicalCondition).set({ ...conditionFields(parsed.data), updatedAt: new Date() }).where(eq(medicalCondition.id, id))
      : db.insert(medicalCondition).values({ ...conditionFields(parsed.data), id, childId: parsedChildId.data, createdBy: user.id }),
  ]
  if (removing.length > 0) {
    statements.push(db.delete(recordFile).where(and(eq(recordFile.medicalConditionId, id), inArray(recordFile.id, removing.map((file) => file.id)))))
  }
  if (verified.length > 0) {
    statements.push(db.insert(recordFile).values(verified.map((file) => ({ ...file, medicalConditionId: id, childId: parsedChildId.data, uploadedBy: user.id }))))
  }

  try {
    await db.batch(statements)
  } catch (error) {
    console.error("[portal] failed to save medical condition", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "That couldn't be saved. Please try again." }
  }

  await discardBlobs(removing.map((file) => file.pathname))
  await recordAudit(user, { action: editing ? "update" : "create", subject: "medical", subjectId: id, childId: parsedChildId.data, summary: editing ? "Edited a medical condition" : "Added a medical condition" })
  return { ok: true, id }
}

export async function deleteCondition(conditionId: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.manage")
  if (!gate.ok) return gate

  const parsedId = z.uuid().safeParse(conditionId)
  if (!parsedId.success) return recordNotFound
  const db = getDb()
  const [row] = await db.select({ id: medicalCondition.id, childId: medicalCondition.childId }).from(medicalCondition).where(eq(medicalCondition.id, parsedId.data))
  if (!row || !(await getPupilFor(gate.user, row.childId))) return recordNotFound

  const files = await db.select({ pathname: recordFile.pathname }).from(recordFile).where(eq(recordFile.medicalConditionId, row.id))
  try {
    await db.delete(medicalCondition).where(eq(medicalCondition.id, row.id))
  } catch (error) {
    console.error("[portal] failed to delete medical condition", error)
    return { ok: false, message: "That couldn't be deleted. Please try again." }
  }

  await discardBlobs(files.map((file) => file.pathname))
  await recordAudit(gate.user, { action: "delete", subject: "medical", subjectId: row.id, childId: row.childId, summary: "Deleted a medical condition" })
  return { ok: true }
}

export async function saveMedication(childId: unknown, medicationId: unknown, values: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.manage")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getPupilFor(user, parsedChildId.data))) return pupilNotFound

  const parsed = medicationSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }

  const db = getDb()
  const editing = medicationId !== null && medicationId !== undefined
  const parsedId = editing ? z.uuid().safeParse(medicationId) : null
  if (parsedId && !parsedId.success) return recordNotFound
  const id = parsedId?.success ? parsedId.data : crypto.randomUUID()

  try {
    if (editing) {
      const updated = await db
        .update(medication)
        .set({ ...medicationFields(parsed.data), updatedAt: new Date() })
        .where(and(eq(medication.id, id), eq(medication.childId, parsedChildId.data)))
        .returning({ id: medication.id })
      if (updated.length === 0) return recordNotFound
    } else {
      await db.insert(medication).values({ ...medicationFields(parsed.data), id, childId: parsedChildId.data, createdBy: user.id })
    }
  } catch (error) {
    console.error("[portal] failed to save medication", error)
    return { ok: false, message: "That couldn't be saved. Please try again." }
  }

  await recordAudit(user, { action: editing ? "update" : "create", subject: "medical", subjectId: id, childId: parsedChildId.data, summary: editing ? "Edited medication" : "Added medication" })
  return { ok: true, id }
}

// Medication with entries in its administration log can't be deleted, because that record has to stay. Mark it inactive instead.
export async function deleteMedication(medicationId: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.manage")
  if (!gate.ok) return gate

  const parsedId = z.uuid().safeParse(medicationId)
  if (!parsedId.success) return recordNotFound
  const db = getDb()
  const [row] = await db.select({ id: medication.id, childId: medication.childId }).from(medication).where(eq(medication.id, parsedId.data))
  if (!row || !(await getPupilFor(gate.user, row.childId))) return recordNotFound

  const [entries] = await db.select({ total: count() }).from(medicationLog).where(eq(medicationLog.medicationId, row.id))
  if ((entries?.total ?? 0) > 0) {
    return { ok: false, message: "This medication has entries in its administration log, so it has to stay on record. Mark it as no longer active instead." }
  }

  try {
    await db.delete(medication).where(eq(medication.id, row.id))
  } catch (error) {
    console.error("[portal] failed to delete medication", error)
    return { ok: false, message: "That couldn't be deleted. Please try again." }
  }

  await recordAudit(gate.user, { action: "delete", subject: "medical", subjectId: row.id, childId: row.childId, summary: "Deleted medication" })
  return { ok: true }
}

export async function recordDose(medicationId: unknown, values: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.record")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedId = z.uuid().safeParse(medicationId)
  if (!parsedId.success) return recordNotFound

  const db = getDb()
  const [med] = await db.select().from(medication).where(eq(medication.id, parsedId.data))
  if (!med || !(await getPupilFor(user, med.childId))) return recordNotFound

  const parsed = doseSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  const entry = parsed.data

  const today = ukToday()
  if (!allowedOutcomes(med.asRequired).includes(entry.outcome)) return { ok: false, message: "That outcome doesn't apply to this medication." }

  if (med.asRequired) {
    if (entry.scheduledFor !== "") return { ok: false, message: "This medication has no set times." }
  } else if (!med.scheduledTimes.includes(entry.scheduledFor)) {
    return { ok: false, message: "Choose one of this medication's set times." }
  }

  if (entry.outcome === "given") {
    const check = canAdminister(med, today)
    if (!check.ok) return { ok: false, message: check.reason }

    if (med.asRequired) {
      const [given] = await db
        .select({ total: count() })
        .from(medicationLog)
        .where(and(eq(medicationLog.medicationId, med.id), eq(medicationLog.occurredOn, today), eq(medicationLog.outcome, "given"), isNull(medicationLog.voidedAt)))
      if (asRequiredAllowance(med.maxDailyDoses, given?.total ?? 0).reached) {
        return { ok: false, message: `The daily maximum of ${med.maxDailyDoses} doses has been reached today.` }
      }
    }
  }

  let witness: { id: string; name: string } | null = null
  if (entry.witnessedById) {
    const [row] = await db.select({ id: userTable.id, name: userTable.name }).from(userTable).where(and(eq(userTable.id, entry.witnessedById), eq(userTable.role, "staff"), eq(userTable.banned, false)))
    if (!row || row.id === user.id) return { ok: false, message: "Choose a different member of staff as the witness." }
    witness = row
  }

  try {
    await db.insert(medicationLog).values({
      medicationId: med.id,
      childId: med.childId,
      occurredOn: today,
      occurredTime: ukNowTime(),
      scheduledFor: orNull(entry.scheduledFor),
      outcome: entry.outcome,
      dose: entry.outcome === "given" ? entry.dose || med.dose : null,
      givenBy: user.id,
      givenByName: user.name,
      witnessedBy: witness?.id ?? null,
      witnessedByName: witness?.name ?? null,
      notes: orNull(entry.notes),
    })
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, message: "That dose has already been recorded. Refresh to see it." }
    console.error("[portal] failed to record dose", error)
    return { ok: false, message: "That couldn't be saved. Please try again." }
  }

  await recordAudit(user, { action: "create", subject: "medical", subjectId: med.id, childId: med.childId, summary: "Recorded a medication entry" })
  return { ok: true }
}

export async function voidDose(logId: unknown, values: unknown): Promise<MedicalResult> {
  const gate = await getActionUser("medical.record")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedId = z.uuid().safeParse(logId)
  if (!parsedId.success) return recordNotFound

  const db = getDb()
  const [row] = await db
    .select({ id: medicationLog.id, childId: medicationLog.childId, givenBy: medicationLog.givenBy, voidedAt: medicationLog.voidedAt })
    .from(medicationLog)
    .where(eq(medicationLog.id, parsedId.data))
  // Same message whether it is missing or not theirs, so ids can't be probed.
  if (!row || !canVoidEntry(user, row) || !(await getPupilFor(user, row.childId))) return recordNotFound

  const parsed = voidDoseSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }

  const voided = await db
    .update(medicationLog)
    .set({ voidedAt: new Date(), voidedBy: user.id, voidedByName: user.name, voidReason: parsed.data.reason })
    .where(and(eq(medicationLog.id, row.id), isNull(medicationLog.voidedAt)))
    .returning({ id: medicationLog.id })
  if (voided.length === 0) return recordNotFound

  await recordAudit(user, { action: "update", subject: "medical", subjectId: row.id, childId: row.childId, summary: "Voided a medication entry" })
  return { ok: true }
}
