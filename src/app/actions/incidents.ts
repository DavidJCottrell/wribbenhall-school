"use server"

import { and, eq, inArray } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { incident, incidentPupil, recordFile } from "@/db/schema"
import { recordAudit } from "@/lib/audit"
import { getActionUser, type CurrentUser } from "@/lib/auth/session"
import { incidentReviewSchema, incidentSchema, type IncidentValues } from "@/lib/forms/schemas"
import { canEditIncident, keepsInjuryDetails, keepsInterventionDetails } from "@/lib/incidents/rules"
import { discardBlobs, verifyUploads, type VerifiedUpload } from "@/lib/portal/file-uploads"
import { getPupilFor, listPupilsFor } from "@/lib/portal/pupils"
import { MAX_FILES_PER_RECORD } from "@/lib/uploads"

export type IncidentResult = { ok: true; id?: string } | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

const checkAnswers = "Some answers need checking. Correct the highlighted fields and save again."
const filesProblem = "One of the files isn't allowed or didn't finish uploading. Please choose it again."
const notFound = { ok: false, message: "That incident could not be found." } as const

const orNull = (value: string) => value || null

// Details that belong to another type of incident are dropped, so they can't linger after the type is changed.
function storedFields(values: IncidentValues) {
  const intervention = keepsInterventionDetails(values.type)
  const injury = keepsInjuryDetails(values.type)
  return {
    occurredOn: values.occurredOn,
    occurredTime: values.occurredTime,
    type: values.type,
    severity: values.severity,
    summary: values.summary,
    description: values.description,
    location: orNull(values.location),
    antecedent: orNull(values.antecedent),
    behaviour: orNull(values.behaviour),
    response: orNull(values.response),
    outcome: orNull(values.outcome),
    injury: injury ? orNull(values.injury) : null,
    firstAid: injury ? orNull(values.firstAid) : null,
    interventionTechnique: intervention ? orNull(values.interventionTechnique) : null,
    interventionMinutes: intervention && values.interventionMinutes ? Number(values.interventionMinutes) : null,
    interventionStaff: intervention ? orNull(values.interventionStaff) : null,
    interventionDebrief: intervention ? orNull(values.interventionDebrief) : null,
    parentsInformedOn: orNull(values.parentsInformedOn),
    parentsInformedBy: orNull(values.parentsInformedBy),
    parentsInformedHow: orNull(values.parentsInformedHow),
  }
}

// Other pupils must be real, current pupils, and not the one the incident is about.
async function validInvolved(user: CurrentUser, childId: string, involved: IncidentValues["involved"]) {
  const known = new Set((await listPupilsFor(user)).map((pupil) => pupil.id))
  const seen = new Set<string>()
  for (const entry of involved) {
    if (entry.childId === childId || !known.has(entry.childId) || seen.has(entry.childId)) return null
    seen.add(entry.childId)
  }
  return involved.map((entry) => ({ childId: entry.childId, role: entry.role }))
}

export async function recordIncident(childId: unknown, values: unknown, uploads?: unknown): Promise<IncidentResult> {
  const gate = await getActionUser("incidents.record")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getPupilFor(user, parsedChildId.data))) return { ok: false, message: "That pupil could not be found." }

  const parsed = incidentSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }

  const others = await validInvolved(user, parsedChildId.data, parsed.data.involved)
  if (!others) return { ok: false, message: "Choose each other pupil once, and not the pupil this is about." }

  let verified: VerifiedUpload[] | null
  try {
    verified = await verifyUploads(parsedChildId.data, uploads)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: filesProblem }

  const incidentId = crypto.randomUUID()
  const db = getDb()
  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.insert(incident).values({ ...storedFields(parsed.data), id: incidentId, childId: parsedChildId.data, createdBy: user.id }),
  ]
  if (others.length > 0) statements.push(db.insert(incidentPupil).values(others.map((other) => ({ ...other, incidentId }))))
  if (verified.length > 0) {
    statements.push(db.insert(recordFile).values(verified.map((file) => ({ ...file, incidentId, childId: parsedChildId.data, uploadedBy: user.id }))))
  }

  try {
    // One batch, so an incident is never saved without its files or the pupils involved.
    await db.batch(statements)
  } catch (error) {
    console.error("[portal] failed to save incident", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The incident couldn't be saved. Please try again." }
  }

  await recordAudit(user, { action: "create", subject: "incident", subjectId: incidentId, childId: parsedChildId.data, summary: "Recorded an incident" })
  return { ok: true, id: incidentId }
}

type EditableIncident = { id: string; childId: string; createdBy: string | null; status: string }

async function findIncident(incidentId: unknown): Promise<EditableIncident | null> {
  const parsedId = z.uuid().safeParse(incidentId)
  if (!parsedId.success) return null
  const [row] = await getDb()
    .select({ id: incident.id, childId: incident.childId, createdBy: incident.createdBy, status: incident.status })
    .from(incident)
    .where(eq(incident.id, parsedId.data))
  return row ?? null
}

export async function updateIncident(incidentId: unknown, values: unknown, newUploads?: unknown, removedFileIds?: unknown): Promise<IncidentResult> {
  const gate = await getActionUser("incidents.record")
  if (!gate.ok) return gate
  const user = gate.user

  const found = await findIncident(incidentId)
  // Same message whether it is missing or not theirs, so ids can't be probed.
  if (!found || !canEditIncident(user, { createdBy: found.createdBy, status: found.status as "open" })) return notFound

  const parsed = incidentSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }

  const others = await validInvolved(user, found.childId, parsed.data.involved)
  if (!others) return { ok: false, message: "Choose each other pupil once, and not the pupil this is about." }

  const removedIds = z.array(z.uuid()).max(MAX_FILES_PER_RECORD).safeParse(removedFileIds ?? [])
  if (!removedIds.success) return { ok: false, message: "That change couldn't be saved. Please try again." }

  const db = getDb()
  const existing = await db.select({ id: recordFile.id, pathname: recordFile.pathname }).from(recordFile).where(eq(recordFile.incidentId, found.id))
  const removing = existing.filter((file) => removedIds.data.includes(file.id))

  let verified: VerifiedUpload[] | null
  try {
    verified = await verifyUploads(found.childId, newUploads)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: filesProblem }

  if (existing.length - removing.length + verified.length > MAX_FILES_PER_RECORD) {
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: `An incident can have up to ${MAX_FILES_PER_RECORD} files.` }
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.update(incident).set({ ...storedFields(parsed.data), updatedAt: new Date() }).where(eq(incident.id, found.id)),
    db.delete(incidentPupil).where(eq(incidentPupil.incidentId, found.id)),
  ]
  if (others.length > 0) statements.push(db.insert(incidentPupil).values(others.map((other) => ({ ...other, incidentId: found.id }))))
  if (removing.length > 0) {
    statements.push(db.delete(recordFile).where(and(eq(recordFile.incidentId, found.id), inArray(recordFile.id, removing.map((file) => file.id)))))
  }
  if (verified.length > 0) {
    statements.push(db.insert(recordFile).values(verified.map((file) => ({ ...file, incidentId: found.id, childId: found.childId, uploadedBy: user.id }))))
  }

  try {
    await db.batch(statements)
  } catch (error) {
    console.error("[portal] failed to change incident", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The incident couldn't be saved. Please try again." }
  }

  await discardBlobs(removing.map((file) => file.pathname))
  await recordAudit(user, { action: "update", subject: "incident", subjectId: found.id, childId: found.childId, summary: "Edited an incident" })
  return { ok: true, id: found.id }
}

export async function reviewIncident(incidentId: unknown, values: unknown): Promise<IncidentResult> {
  const gate = await getActionUser("incidents.review")
  if (!gate.ok) return gate
  const user = gate.user

  const found = await findIncident(incidentId)
  if (!found) return notFound

  const parsed = incidentReviewSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: checkAnswers, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  const review = parsed.data

  // Signing off records who and when. Reopening clears it.
  const signedOff = review.status === "closed"
  try {
    await getDb()
      .update(incident)
      .set({
        status: review.status,
        reviewNotes: orNull(review.reviewNotes),
        shareWithParents: review.shareWithParents,
        parentSummary: orNull(review.parentSummary),
        reviewedBy: signedOff ? user.id : null,
        reviewedAt: signedOff ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(incident.id, found.id))
  } catch (error) {
    console.error("[portal] failed to review incident", error)
    return { ok: false, message: "The review couldn't be saved. Please try again." }
  }

  await recordAudit(user, {
    action: "update",
    subject: "incident",
    subjectId: found.id,
    childId: found.childId,
    summary: `Reviewed an incident: ${review.status.replace("_", " ")}${review.shareWithParents ? ", shared with parents" : ""}`,
  })
  return { ok: true, id: found.id }
}

export async function deleteIncident(incidentId: unknown): Promise<IncidentResult> {
  const gate = await getActionUser("incidents.review")
  if (!gate.ok) return gate

  const found = await findIncident(incidentId)
  if (!found) return notFound

  const db = getDb()
  const files = await db.select({ pathname: recordFile.pathname }).from(recordFile).where(eq(recordFile.incidentId, found.id))

  try {
    // File rows and the list of pupils involved go with it (cascade). The files are removed afterwards.
    await db.delete(incident).where(eq(incident.id, found.id))
  } catch (error) {
    console.error("[portal] failed to delete incident", error)
    return { ok: false, message: "The incident couldn't be deleted. Please try again." }
  }

  await discardBlobs(files.map((file) => file.pathname))
  await recordAudit(gate.user, { action: "delete", subject: "incident", subjectId: found.id, childId: found.childId, summary: "Deleted an incident" })
  return { ok: true }
}
