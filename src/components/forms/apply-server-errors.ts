import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string[] | undefined> | undefined,
) {
  if (!fieldErrors) return
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) setError(field as Path<T>, { type: "server", message: messages[0] })
  }
}
