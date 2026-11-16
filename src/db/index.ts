import "server-only"

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return drizzle({ client: neon(url), schema })
}

let cached: ReturnType<typeof createDb> | undefined

// Created on first use so builds and static pages don't need a database.
export function getDb() {
  cached ??= createDb()
  return cached
}
