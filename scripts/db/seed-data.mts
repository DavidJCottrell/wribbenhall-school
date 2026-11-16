// Fills a development or preview database from fixtures.mts. Shared by db:seed and db:reset-preview.
import { getDb } from "../../src/db"
import * as schema from "../../src/db/schema"
import { child, childUpdate, guardianship, pupilContact, user } from "../../src/db/schema"
export { appTables } from "./app-tables.mjs"
import { DEV_PASSWORD, DEV_PASSWORD_HASH, TEST_EMAIL_DOMAIN, contacts, guardianships, pupils, reports, users } from "./fixtures.mjs"

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

  const [existingReport] = await db.select({ id: childUpdate.id }).from(childUpdate).limit(1)
  if (!existingReport) {
    await db
      .insert(childUpdate)
      .values(reports.map(({ pupilId, daysAgo: days, ...report }) => ({ ...report, childId: pupilId, occurredOn: daysAgo(days) })))
  }
}
