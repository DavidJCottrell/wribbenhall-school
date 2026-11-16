// Fills a development or preview database from fixtures.mts. Shared by db:seed and db:reset-preview.
import { sql } from "drizzle-orm"

import { getDb } from "../../src/db"
import * as schema from "../../src/db/schema"
import { attendanceMark, child, dayReport, guardianship, incident, incidentPupil, pupilContact, user } from "../../src/db/schema"
export { appTables } from "./app-tables.mjs"
import { attendanceSeedStatements } from "./build-reset-sql.mjs"
import { DEV_PASSWORD, DEV_PASSWORD_HASH, TEST_EMAIL_DOMAIN, contacts, guardianships, incidents, pupils, reports, users } from "./fixtures.mjs"

export { DEV_PASSWORD }

export const seededAccounts = users.map((fixture) => ({ email: fixture.email, role: fixture.description }))

// Stops these scripts touching a database that holds anyone's real login.
export async function assertOnlyTestUsers() {
  const emails = await getDb().select({ email: user.email }).from(user)
  const real = emails.filter(({ email }) => !email.toLowerCase().endsWith(TEST_EMAIL_DOMAIN))
  if (real.length > 0) {
    throw new Error(
      `Refusing to continue: ${real.length} login(s) in this database don't use ${TEST_EMAIL_DOMAIN} addresses, so it may hold real data. ` +
        "Only test databases are allowed. If this is a preview database, delete those logins first.",
    )
  }
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

// Adds the fixtures. Safe to run on an empty database or one that already has some of them.
export async function seedDevData() {
  const db = getDb()
  const { account } = schema

  await db
    .insert(user)
    .values(users.map(({ id, name, email, kind, permissions }) => ({ id, name, email, role: kind, permissions, emailVerified: false })))
    .onConflictDoNothing()
  await db
    .insert(account)
    .values(users.map(({ id }) => ({ id: `account-${id}`, accountId: id, providerId: "credential", userId: id, password: DEV_PASSWORD_HASH })))
    .onConflictDoNothing()

  await db.insert(child).values(pupils.map(({ ...pupil }) => pupil)).onConflictDoNothing()
  await db.insert(pupilContact).values(contacts.map(({ pupilId, ...contact }) => ({ ...contact, childId: pupilId }))).onConflictDoNothing()
  await db.insert(guardianship).values(guardianships.map(({ pupilId, ...link }) => ({ ...link, childId: pupilId }))).onConflictDoNothing()

  const [existingReport] = await db.select({ id: dayReport.id }).from(dayReport).limit(1)
  if (!existingReport) {
    await db
      .insert(dayReport)
      .values(reports.map(({ pupilId, daysAgo: days, ...report }) => ({ ...report, childId: pupilId, reportDate: daysAgo(days) })))
  }

  const [existingIncident] = await db.select({ id: incident.id }).from(incident).limit(1)
  if (!existingIncident) {
    await db.insert(incident).values(
      incidents.map((fixture) => ({
        id: fixture.id,
        childId: fixture.pupilId,
        createdBy: fixture.createdBy,
        occurredOn: daysAgo(fixture.daysAgo),
        occurredTime: fixture.time,
        type: fixture.type,
        severity: fixture.severity,
        location: fixture.location,
        summary: fixture.summary,
        description: fixture.description,
        injury: fixture.injury,
        firstAid: fixture.firstAid,
        interventionTechnique: fixture.intervention?.technique ?? null,
        interventionMinutes: fixture.intervention?.minutes ?? null,
        interventionStaff: fixture.intervention?.staff ?? null,
        interventionDebrief: fixture.intervention?.debrief ?? null,
        parentsInformedOn: fixture.parentsInformed ? daysAgo(fixture.parentsInformed.daysAgo) : null,
        parentsInformedBy: fixture.parentsInformed?.by ?? null,
        parentsInformedHow: fixture.parentsInformed?.how ?? null,
        status: fixture.status,
        reviewedBy: fixture.reviewedBy,
        reviewedAt: fixture.reviewedBy ? new Date() : null,
        reviewNotes: fixture.reviewNotes,
        shareWithParents: fixture.shareWithParents,
        parentSummary: fixture.parentSummary,
      })),
    )
    await db.insert(incidentPupil).values(incidents.flatMap((fixture) => fixture.involved.map((other) => ({ incidentId: fixture.id, childId: other.pupilId, role: other.role }))))
  }

  const [existingMark] = await db.select({ childId: attendanceMark.childId }).from(attendanceMark).limit(1)
  if (!existingMark) {
    // Written as SQL so it matches the reset script exactly. Run one statement at a time.
    for (const statement of attendanceSeedStatements()) await db.execute(sql.raw(statement))
  }
}
