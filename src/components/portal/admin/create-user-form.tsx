"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createUser, type TemporaryCredentials } from "@/app/actions/logins"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createUserSchema, type CreateUserValues } from "@/lib/forms/schemas"

import { LoginFields } from "./login-fields"
import { TemporaryPassword } from "./temporary-password"

const emptyValues: CreateUserValues = { name: "", email: "", kind: "staff", permissions: [] }

export function CreateUserForm() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: emptyValues,
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    setCredentials(null)
    startTransition(async () => {
      const result = await createUser(values)
      if (result.ok) {
        setCredentials(result.credentials)
        form.reset(emptyValues)
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
          <LoginFields control={form.control} idPrefix="new-" />
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
