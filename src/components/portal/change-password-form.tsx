"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { changeOwnPassword } from "@/app/actions/account"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { MIN_PASSWORD_LENGTH, changePasswordSchema, type ChangePasswordValues } from "@/lib/forms/schemas"

const emptyValues: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" }

export function ChangePasswordForm({ redirectAfter }: { redirectAfter: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: emptyValues,
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changeOwnPassword(values)
      if (result.ok) {
        toast.success("Your password has been changed")
        form.reset(emptyValues)
        if (redirectAfter) router.replace("/portal")
        router.refresh()
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <TextField
          control={form.control}
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <TextField
          control={form.control}
          name="newPassword"
          label="New password"
          description={`At least ${MIN_PASSWORD_LENGTH} characters. Three or four unrelated words is easy to remember and hard to guess.`}
          type="password"
          autoComplete="new-password"
        />
        <TextField control={form.control} name="confirmPassword" label="New password again" type="password" autoComplete="new-password" />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Changing password" : "Change password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
