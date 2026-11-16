import { getTableName, is } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"

import * as schema from "../../src/db/schema"

// Every table that holds app data. A test checks that the reset scripts cover all of them.
export const appTables = (Object.values(schema) as unknown[])
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableName(table))
  // Sorted, because module export order differs between runners.
  .sort()
