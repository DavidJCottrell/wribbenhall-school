"use server"

import { isValid, parseISO } from "date-fns"
import { and, eq, inArray, sql } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { z } from "zod"

import { getDb } from "@/db"
import { attendanceMark } from "@/db/schema"
import { invalidInput, type ActionFailure, type ActionResult } from "@/lib/action-result"
import { recordAudit } from "@/lib/audit"
import { isAttendanceCode, registerChoices, type AttendanceCode, type AttendanceSession } from "@/lib/attendance/codes"
import { canRecordAttendanceOn } from "@/lib/attendance/rules"
import { can } from "@/lib/auth/permissions"
import { getActionUser } from "@/lib/auth/session"
import { ukToday } from "@/lib/dates"
import { listPupilsFor } from "@/lib/portal/pupils"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => isValid(parseISO(value)), "Not a real date")

// A blank choice means "no mark recorded".
const choice = z.union([z.literal(""), z.custom<AttendanceCode>((value) => isAttendanceCode(value) && (registerChoices as readonly string[]).includes(value))])

const rowSchema = z.object({
  pupilId: z.uuid(),
  am: choice,
  pm: choice,
  note: z.string().trim().max(300, "Notes must be 300 characters or fewer"),
})

const registerSchema = z.object({ date: isoDate, rows: z.array(rowSchema).max(100) })

export type SaveRegisterInput = z.input<typeof registerSchema>

const SESSIONS: AttendanceSession[] = ["am", "pm"]

const notAllowedOnDate: ActionFailure = {
  ok: false,
  message: "You can't change the register for that date. People who take the register can correct today and the last week. Older dates need permission to manage attendance.",
}

export async function saveRegister(input: unknown): Promise<ActionResult<{ saved: number }>> {
  const gate = await getActionUser("attendance.record")
  if (!gate.ok) return gate
  const user = gate.user

  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error)
  const { date, rows } = parsed.data

  if (!canRecordAttendanceOn(user, date, ukToday())) return notAllowedOnDate
  if (rows.length === 0) return { ok: true, saved: 0 }

  // Only current pupils appear on the register, so a made-up or archived id is refused.
  const pupilIds = new Set((await listPupilsFor(user)).map((pupil) => pupil.id))
  if (rows.some((row) => !pupilIds.has(row.pupilId))) return { ok: false, message: "One of those pupils could not be found." }

  const db = getDb()
  const existing = await db
    .select({ childId: attendanceMark.childId, session: attendanceMark.session, code: attendanceMark.code })
    .from(attendanceMark)
    .where(and(eq(attendanceMark.markDate, date), inArray(attendanceMark.childId, rows.map((row) => row.pupilId))))

  // A day the school was closed is changed by reopening it, not by typing over it.
  if (existing.some((mark) => mark.code === "closed")) {
    return { ok: false, message: "The school was marked as closed on that day. Reopen the day first if the register should be taken." }
  }

  const existingKeys = new Set(existing.map((mark) => `${mark.childId}:${mark.session}`))
  const statements: BatchItem<"pg">[] = []
  let saved = 0

  for (const row of rows) {
    const note = row.note === "" ? null : row.note
    // The note belongs to the day. It is kept on the morning mark, or the afternoon one if there is no morning mark.
    const noteSession: AttendanceSession = row.am !== "" ? "am" : "pm"

    for (const session of SESSIONS) {
      const code = session === "am" ? row.am : row.pm
      if (code === "") {
        if (existingKeys.has(`${row.pupilId}:${session}`)) {
          statements.push(db.delete(attendanceMark).where(and(eq(attendanceMark.childId, row.pupilId), eq(attendanceMark.markDate, date), eq(attendanceMark.session, session))))
        }
        continue
      }

      const values = { childId: row.pupilId, markDate: date, session, code, note: session === noteSession ? note : null, recordedBy: user.id }
      statements.push(
        db
          .insert(attendanceMark)
          .values(values)
          .onConflictDoUpdate({
            target: [attendanceMark.childId, attendanceMark.markDate, attendanceMark.session],
            set: { code, note: values.note, recordedBy: user.id, updatedAt: sql`now()` },
          }),
      )
      saved += 1
    }
  }

  if (statements.length === 0) return { ok: true, saved: 0 }

  try {
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]])
  } catch (error) {
    console.error("[attendance] failed to save the register", error)
    return { ok: false, message: "The register couldn't be saved. Please try again." }
  }

  await recordAudit(user, { action: "update", subject: "attendance", summary: `Recorded the register for ${date} (${saved} marks)` })
  return { ok: true, saved }
}

const dayInput = z.object({ date: isoDate, confirmOverwrite: z.boolean().optional() })

export async function closeSchoolDay(input: unknown): Promise<ActionResult<{ closed: number }>> {
  const gate = await getActionUser("attendance.manage")
  if (!gate.ok) return gate
  const user = gate.user

  const parsed = dayInput.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error)
  const { date, confirmOverwrite } = parsed.data

  if (!canRecordAttendanceOn(user, date, ukToday())) return notAllowedOnDate

  const db = getDb()
  const pupils = await listPupilsFor(user)
  if (pupils.length === 0) return { ok: false, message: "There are no pupils to close the day for." }

  const existing = await db
    .select({ code: attendanceMark.code })
    .from(attendanceMark)
    .where(and(eq(attendanceMark.markDate, date), inArray(attendanceMark.childId, pupils.map((pupil) => pupil.id))))
  const replacing = existing.filter((mark) => mark.code !== "closed").length

  if (replacing > 0 && !confirmOverwrite) {
    return { ok: false, message: `${replacing} marks already recorded for this day would be replaced. Confirm to close the day anyway.` }
  }

  const statements: BatchItem<"pg">[] = pupils.flatMap((pupil) =>
    SESSIONS.map((session) =>
      db
        .insert(attendanceMark)
        .values({ childId: pupil.id, markDate: date, session, code: "closed", note: null, recordedBy: user.id })
        .onConflictDoUpdate({
          target: [attendanceMark.childId, attendanceMark.markDate, attendanceMark.session],
          set: { code: "closed", note: null, recordedBy: user.id, updatedAt: sql`now()` },
        }),
    ),
  )

  try {
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]])
  } catch (error) {
    console.error("[attendance] failed to close the day", error)
    return { ok: false, message: "The day couldn't be closed. Please try again." }
  }

  await recordAudit(user, { action: "update", subject: "attendance", summary: `Closed the school for ${date}${replacing ? `, replacing ${replacing} marks` : ""}` })
  return { ok: true, closed: pupils.length }
}

export async function reopenSchoolDay(input: unknown): Promise<ActionResult> {
  const gate = await getActionUser("attendance.manage")
  if (!gate.ok) return gate
  const user = gate.user

  const parsed = dayInput.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error)
  if (!can(user, "attendance.manage") || !canRecordAttendanceOn(user, parsed.data.date, ukToday())) return notAllowedOnDate

  try {
    await getDb().delete(attendanceMark).where(and(eq(attendanceMark.markDate, parsed.data.date), eq(attendanceMark.code, "closed")))
  } catch (error) {
    console.error("[attendance] failed to reopen the day", error)
    return { ok: false, message: "The day couldn't be reopened. Please try again." }
  }

  await recordAudit(user, { action: "update", subject: "attendance", summary: `Reopened the register for ${parsed.data.date}` })
  return { ok: true }
}
