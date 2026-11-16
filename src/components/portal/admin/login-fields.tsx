"use client"

import { useWatch, type Control } from "react-hook-form"

import { SelectField, TextField } from "@/components/forms/fields"
import type { CreateUserValues } from "@/lib/forms/schemas"

import { PermissionPicker } from "./permission-picker"

export const kindOptions = [
  { value: "parent", label: "Parent or carer" },
  { value: "staff", label: "Staff" },
]

type Props = {
  control: Control<CreateUserValues>
  // Keeps ids unique when this form and another are on the page.
  idPrefix?: string
  // Your own login can't change kind, so the choice is hidden.
  lockKind?: boolean
  // And your own login must keep the ability to manage logins, so the picker still shows but the server enforces it.
}

export function LoginFields({ control, idPrefix = "", lockKind = false }: Props) {
  const kind = useWatch({ control, name: "kind" })

  return (
    <>
      <div className="grid gap-7 sm:grid-cols-2">
        <TextField control={control} id={`${idPrefix}name`} name="name" label="Full name" autoComplete="off" />
        <TextField control={control} id={`${idPrefix}email`} name="email" label="Email address" type="email" autoComplete="off" inputMode="email" />
      </div>
      {lockKind ? (
        <p className="text-muted-foreground">You can&apos;t change your own kind of login.</p>
      ) : (
        <SelectField control={control} id={`${idPrefix}kind`} name="kind" label="Kind of login" options={kindOptions} />
      )}
      {kind === "staff" ? <PermissionPicker control={control} name="permissions" idPrefix={idPrefix} /> : null}
    </>
  )
}
