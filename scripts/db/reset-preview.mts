// Wipes a TEST database and fills it with fresh fictional data.
//
//   ALLOW_DEV_SEED=true npm run db:reset-preview            shows what it would wipe, changes nothing
//   ALLOW_DEV_SEED=true CONFIRM_RESET_HOST=<host> npm run db:reset-preview
//   ... add `-- --files` to also delete uploaded files from the Blob store (BLOB_READ_WRITE_TOKEN must be the preview store's)
//
// It refuses to run if any login in the database isn't an @example.test address, so it can't wipe real data.
import { del, list } from "@vercel/blob"
import { count, sql } from "drizzle-orm"

import { getDb } from "../../src/db"
import { child, childUpdate, user } from "../../src/db/schema"
import { DEV_PASSWORD, assertOnlyTestUsers, seedDevData, seededAccounts } from "./seed-data.mjs"

if (process.env.ALLOW_DEV_SEED !== "true") {
  throw new Error("Refusing to reset. Set ALLOW_DEV_SEED=true, and only for a development or preview database.")
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")

const target = new URL(process.env.DATABASE_URL)
const host = target.hostname
const wipeFiles = process.argv.includes("--files")
const db = getDb()

await assertOnlyTestUsers()

const [[users], [pupils], [updates]] = await Promise.all([
  db.select({ total: count() }).from(user),
  db.select({ total: count() }).from(child),
  db.select({ total: count() }).from(childUpdate),
])

if (process.env.CONFIRM_RESET_HOST !== host) {
  console.log(`This would wipe ${users.total} logins, ${pupils.total} pupils and ${updates.total} updates in:`)
  console.log(`  database ${target.pathname.slice(1)} on ${host}`)
  console.log(wipeFiles ? "  and delete every uploaded file in the Blob store." : "  (uploaded files are left alone. Add `-- --files` to delete them too.)")
  console.log("\nIf that is the TEST database you meant, run it again with:")
  console.log(`  CONFIRM_RESET_HOST=${host}`)
  process.exit(1)
}

// Only app data. The migration history is kept, so the schema stays as it is.
await db.execute(
  sql`TRUNCATE TABLE "child_update_attachment", "child_update", "guardianship", "staff_assignment", "child", "session", "account", "verification", "rate_limit", "user" CASCADE`,
)

let removedFiles = 0
if (wipeFiles) {
  let cursor: string | undefined
  do {
    const page = await list({ prefix: "children/", cursor, limit: 1000 })
    const pathnames = page.blobs.map((blob) => blob.pathname)
    for (let start = 0; start < pathnames.length; start += 100) await del(pathnames.slice(start, start + 100))
    removedFiles += pathnames.length
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
}

await seedDevData()

console.log(`Reset ${host}. Removed ${users.total} logins, ${pupils.total} pupils, ${updates.total} updates${wipeFiles ? ` and ${removedFiles} files` : ""}.`)
console.log(`Fictional accounts (password ${DEV_PASSWORD}):`)
for (const account of seededAccounts) console.log(`  ${account.email}  ${account.role}`)
