// Adds fictional accounts and pupils to a development or preview database. Never run this against production.
import { DEV_PASSWORD, assertOnlyTestUsers, seedDevData, seededAccounts } from "./seed-data.mjs"

if (process.env.ALLOW_DEV_SEED !== "true") {
  throw new Error("Refusing to seed. Set ALLOW_DEV_SEED=true, and only for a development or preview database.")
}

await assertOnlyTestUsers()
await seedDevData()

console.log(`Seeded. Fictional accounts (password ${DEV_PASSWORD}):`)
for (const account of seededAccounts) console.log(`  ${account.email}  ${account.role}`)
