"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createUser, type TemporaryCredentials } from "@/app/actions/admin"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createUserSchema, type CreateUserValues } from "@/lib/forms/schemas"

import { TemporaryPassword } from "./temporary-password"

const roleOptions = [
  { value: "parent", label: "Parent or carer" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Administrator" },
]

export function CreateUserForm() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    setCredentials(null)
    startTransition(async () => {
      const result = await createUser(values)
      if (result.ok) {
        setCredentials(result.credentials)
        form.reset({ name: "", email: "" })
        router.refresh()
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <div className="grid gap-7 sm:grid-cols-2">
            <TextField control={form.control} name="name" label="Full name" autoComplete="off" />
            <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="off" inputMode="email" />
          </div>
          <SelectField control={form.control} name="role" label="Role" options={roleOptions} />
          <div>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Creating login" : "Create login"}
            </Button>
          </div>
        </FieldGroup>
      </form>
      {credentials ? <TemporaryPassword credentials={credentials} /> : null}
    </div>
  )
}
