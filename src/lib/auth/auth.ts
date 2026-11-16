import "server-only"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"
import { eq } from "drizzle-orm"
import { after } from "next/server"

import { getDb } from "@/db"
import * as schema from "@/db/schema"
import { sendEmail } from "@/lib/email/send"
import { getSiteUrl } from "@/lib/email/site-url"
import { passwordResetEmail } from "@/lib/email/templates"

const RESET_TOKEN_SECONDS = 60 * 60

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // Accounts are created by the school, never by visitors.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        // Disabled logins get no email, and the page gives nothing away either way.
        if ((user as { banned?: boolean | null }).banned) return

        const siteUrl = getSiteUrl()
        if (!siteUrl) throw new Error("BETTER_AUTH_URL must be set on the live site to send password reset links")

        await sendEmail(
          passwordResetEmail({
            to: user.email,
            name: user.name,
            link: `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`,
            validForMinutes: RESET_TOKEN_SECONDS / 60,
          }),
        )
      },
      // They picked their own password, so a temporary one no longer needs replacing.
      onPasswordReset: async ({ user }) => {
        await getDb().update(schema.user).set({ mustChangePassword: false }).where(eq(schema.user.id, user.id))
      },
    },
    advanced: {
      // Serverless functions can stop as soon as the response is sent, which would drop the email.
      backgroundTasks: {
        handler: (promise) => {
          try {
            after(() => promise)
          } catch {
            // Outside a request (scripts), just let it run.
            void promise.catch((error) => console.error("[auth] background task failed", error))
          }
        },
      },
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
        // Stops someone using this to flood an inbox. Shared by everyone on one IP address, so not too tight.
        "/request-password-reset": { window: 3600, max: 10 },
        "/reset-password": { window: 300, max: 10 },
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
