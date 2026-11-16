"use server"

import { and, eq, inArray } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { dayReport, recordFile } from "@/db/schema"
import { recordAudit } from "@/lib/audit"
import { getActionUser, type CurrentUser } from "@/lib/auth/session"
import { dayReportSchema, type DayReportValues } from "@/lib/forms/schemas"
import { canManageDayReport } from "@/lib/portal/day-reports"
import { discardBlobs, verifyUploads, type VerifiedUpload } from "@/lib/portal/file-uploads"
import { getPupilFor } from "@/lib/portal/pupils"
import { MAX_FILES_PER_RECORD } from "@/lib/uploads"

function storedFields(values: DayReportValues) {
  return { ...values, session: values.session || null, subject: values.subject || null }
}

export type DayReportResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

export async function addDayReport(childId: unknown, values: unknown, attachments?: unknown): Promise<DayReportResult> {
  const gate = await getActionUser("reports.write")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getPupilFor(user, parsedChildId.data))) {
    return { ok: false, message: "That pupil could not be found." }
  }

  const parsed = dayReportSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and save again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  let verified: VerifiedUpload[] | null
  try {
    verified = await verifyUploads(parsedChildId.data, attachments)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: "One of the files isn't allowed or didn't finish uploading. Please choose it again." }

  const reportId = crypto.randomUUID()
  const db = getDb()
  const saveReport = db
    .insert(dayReport)
    .values({ ...storedFields(parsed.data), id: reportId, childId: parsedChildId.data, authorId: user.id })

  try {
    // One batch, so a report is never saved without its files.
    if (verified.length > 0) {
      await db.batch([
        saveReport,
        db.insert(recordFile).values(verified.map((file) => ({ ...file, dayReportId: reportId, childId: parsedChildId.data, uploadedBy: user.id }))),
      ])
    } else {
      await saveReport
    }
    await recordAudit(user, { action: "create", subject: "report", subjectId: reportId, childId: parsedChildId.data, summary: "Added a daily report" })
    return { ok: true }
  } catch (error) {
    console.error("[portal] failed to save day report", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The report couldn't be saved. Please try again." }
  }
}

type ManageableDayReport =
  | { ok: true; user: CurrentUser; report: { id: string; childId: string; authorId: string | null } }
  | { ok: false; message: string }

// Finds a report the current user may change, or says why not. Parents never can.
async function manageableDayReport(reportId: unknown): Promise<ManageableDayReport> {
  const gate = await getActionUser("reports.write")
  if (!gate.ok) return gate
  const user = gate.user

  const parsedId = z.uuid().safeParse(reportId)
  if (!parsedId.success) return { ok: false, message: "That report could not be found." }

  const [row] = await getDb()
    .select({ id: dayReport.id, childId: dayReport.childId, authorId: dayReport.authorId })
    .from(dayReport)
    .where(eq(dayReport.id, parsedId.data))

  // Same message whether it is missing or not theirs, so ids can't be probed.
  if (!row || !canManageDayReport(user, row) || !(await getPupilFor(user, row.childId))) {
    return { ok: false, message: "That report could not be found." }
  }
  return { ok: true, user, report: row }
}

export async function updateDayReport(
  reportId: unknown,
  values: unknown,
  newAttachments?: unknown,
  removedAttachmentIds?: unknown,
): Promise<DayReportResult> {
  const found = await manageableDayReport(reportId)
  if (!found.ok) return found
  const { report } = found

  const parsed = dayReportSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and save again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  const removedIds = z.array(z.uuid()).max(MAX_FILES_PER_RECORD).safeParse(removedAttachmentIds ?? [])
  if (!removedIds.success) return { ok: false, message: "That change couldn't be saved. Please try again." }

  const db = getDb()
  const existing = await db
    .select({ id: recordFile.id, pathname: recordFile.pathname })
    .from(recordFile)
    .where(eq(recordFile.dayReportId, report.id))
  const removing = existing.filter((file) => removedIds.data.includes(file.id))

  let verified: VerifiedUpload[] | null
  try {
    verified = await verifyUploads(report.childId, newAttachments)
  } catch (error) {
    console.error("[portal] couldn't check uploads", error)
    return { ok: false, message: "Your files couldn't be checked. Please try again." }
  }
  if (!verified) return { ok: false, message: "One of the files isn't allowed or didn't finish uploading. Please choose it again." }

  if (existing.length - removing.length + verified.length > MAX_FILES_PER_RECORD) {
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: `A report can have up to ${MAX_FILES_PER_RECORD} files.` }
  }

  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.update(dayReport).set({ ...storedFields(parsed.data), updatedAt: new Date() }).where(eq(dayReport.id, report.id)),
  ]
  if (removing.length > 0) {
    statements.push(
      db.delete(recordFile).where(
        and(eq(recordFile.dayReportId, report.id), inArray(recordFile.id, removing.map((file) => file.id))),
      ),
    )
  }
  if (verified.length > 0) {
    statements.push(db.insert(recordFile).values(verified.map((file) => ({ ...file, dayReportId: report.id, childId: report.childId, uploadedBy: found.user.id }))))
  }

  try {
    await db.batch(statements)
  } catch (error) {
    console.error("[portal] failed to change day report", error)
    await discardBlobs(verified.map((file) => file.pathname))
    return { ok: false, message: "The report couldn't be saved. Please try again." }
  }

  await discardBlobs(removing.map((file) => file.pathname))
  await recordAudit(found.user, { action: "update", subject: "report", subjectId: report.id, childId: report.childId, summary: "Edited a daily report" })
  return { ok: true }
}

export async function deleteDayReport(reportId: unknown): Promise<DayReportResult> {
  const found = await manageableDayReport(reportId)
  if (!found.ok) return found

  const db = getDb()
  const files = await db
    .select({ pathname: recordFile.pathname })
    .from(recordFile)
    .where(eq(recordFile.dayReportId, found.report.id))

  try {
    // Attachment rows go with it (cascade). The files are removed afterwards.
    await db.delete(dayReport).where(eq(dayReport.id, found.report.id))
  } catch (error) {
    console.error("[portal] failed to delete day report", error)
    return { ok: false, message: "The report couldn't be deleted. Please try again." }
  }

  await discardBlobs(files.map((file) => file.pathname))
  await recordAudit(found.user, { action: "delete", subject: "report", subjectId: found.report.id, childId: found.report.childId, summary: "Deleted a daily report" })
  return { ok: true }
}
