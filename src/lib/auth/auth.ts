import "server-only"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"

import { getDb } from "@/db"
import * as schema from "@/db/schema"

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // Accounts are created by the school, never by visitors.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    // Serverless instances don't share memory, so limits live in the database.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      customRules: {
        // Per IP address, and staff share the school's. Keep this high enough for a staff room at 8:30.
        "/sign-in/email": { window: 300, max: 15 },
      },
    },
    user: {
      additionalFields: {
        // Never settable by the client. Only server code changes it.
        mustChangePassword: { type: "boolean", defaultValue: false, input: false },
      },
    },
    plugins: [
      admin({ defaultRole: "parent", adminRoles: ["admin"] }),
      // Must stay last so server actions can set cookies.
      nextCookies(),
    ],
  })
}

let cached: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  cached ??= createAuth()
  return cached
}
