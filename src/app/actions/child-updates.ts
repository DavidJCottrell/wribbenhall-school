"use server"

import { z } from "zod"

import { getDb } from "@/db"
import { childUpdate } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { childUpdateSchema } from "@/lib/forms/schemas"
import { getChildFor } from "@/lib/portal/children"

export type AddChildUpdateResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

export async function addChildUpdate(childId: unknown, values: unknown): Promise<AddChildUpdateResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Your session has ended. Please log in again." }
  if (user.role === "parent") return { ok: false, message: "Only staff can add updates." }

  const parsedChildId = z.uuid().safeParse(childId)
  if (!parsedChildId.success || !(await getChildFor(user, parsedChildId.data))) {
    return { ok: false, message: "That pupil could not be found." }
  }

  const parsed = childUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some answers need checking. Correct the highlighted fields and save again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  try {
    await getDb()
      .insert(childUpdate)
      .values({ ...parsed.data, childId: parsedChildId.data, authorId: user.id })
    return { ok: true }
  } catch (error) {
    console.error("[portal] failed to save child update", error)
    return { ok: false, message: "The update couldn't be saved. Please try again." }
  }
}
