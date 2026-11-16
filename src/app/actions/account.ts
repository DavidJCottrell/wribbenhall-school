"use server"

import { eq } from "drizzle-orm"
import { isAPIError } from "better-auth/api"
import { headers } from "next/headers"
import { z } from "zod"

import { getDb } from "@/db"
import { user as userTable } from "@/db/schema"
import { getAuth } from "@/lib/auth/auth"
import { getCurrentUser } from "@/lib/auth/session"
import { changePasswordSchema } from "@/lib/forms/schemas"

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

export async function changeOwnPassword(values: unknown): Promise<ChangePasswordResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Your session has ended. Please log in again." }

  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  try {
    // Checks the current password, and signs out every other device.
    await getAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") {
      return {
        ok: false,
        message: "Your current password isn't correct.",
        fieldErrors: { currentPassword: ["This isn't your current password"] },
      }
    }
    console.error("[account] failed to change password", error)
    return { ok: false, message: "Your password couldn't be changed. Please try again." }
  }

  await getDb().update(userTable).set({ mustChangePassword: false }).where(eq(userTable.id, user.id))
  return { ok: true }
}
