import { migrate } from "drizzle-orm/neon-http/migrator"

import { getDb } from "../../src/db"

await migrate(getDb(), { migrationsFolder: "./drizzle" })
console.log("Migrations applied")
