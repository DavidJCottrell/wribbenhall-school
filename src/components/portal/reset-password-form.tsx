"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { TextField } from "@/components/forms/fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/auth-client"
import { MIN_PASSWORD_LENGTH, resetPasswordSchema, type ResetPasswordValues } from "@/lib/forms/schemas"

const SERVER_ERROR = 500

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit(({ newPassword }) => {
    setErrorMessage(null)
    startTransition(async () => {
      const { error } = await authClient.resetPassword({ newPassword, token })
      if (!error) {
        setDone(true)
      } else if (error.status !== undefined && error.status >= SERVER_ERROR) {
        setErrorMessage("Something went wrong on our side. Please try again in a moment, or contact the school office.")
      } else {
        setErrorMessage("This link has expired or has already been used. Please ask for a new one.")
      }
    })
  })

  if (done) {
    return (
      <Alert role="status">
        <AlertTitle>Your password has been changed</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>You have been logged out everywhere. Log in with your new password.</p>
          <p>
            <Link href="/login" className="font-semibold underline underline-offset-4">
              Go to log in
            </Link>
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {errorMessage ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              {errorMessage}{" "}
              <Link href="/forgot-password" className="underline underline-offset-4">
                Ask for a new link
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}
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
            {pending ? "Saving" : "Change password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
