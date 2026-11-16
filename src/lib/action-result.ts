import { z } from "zod"

export type ActionFailure = { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

export type ActionResult<T extends object = object> = ({ ok: true } & T) | ActionFailure

export function invalidInput(error: z.ZodError): ActionFailure {
  return {
    ok: false,
    message: "Some answers need checking. Correct the highlighted fields and try again.",
    fieldErrors: z.flattenError(error).fieldErrors,
  }
}

export const notFound = (what: string): ActionFailure => ({ ok: false, message: `That ${what} could not be found.` })
