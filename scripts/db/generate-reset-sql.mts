import { writeFileSync } from "node:fs"

import { buildResetSql } from "./build-reset-sql.mjs"

writeFileSync(new URL("./reset-preview.sql", import.meta.url), buildResetSql())
console.log("Wrote scripts/db/reset-preview.sql")
