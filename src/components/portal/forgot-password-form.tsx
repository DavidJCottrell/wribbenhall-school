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
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/forms/schemas"

const TOO_MANY_ATTEMPTS = 429
const SERVER_ERROR = 500

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit(({ email }) => {
    setErrorMessage(null)
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({ email })
      if (!error) {
        setSentTo(email)
      } else if (error.status === TOO_MANY_ATTEMPTS) {
        setErrorMessage("Too many requests. Please wait a while and try again.")
      } else if (error.status !== undefined && error.status >= SERVER_ERROR) {
        setErrorMessage("Something went wrong on our side. Please try again in a moment, or contact the school office.")
      } else {
        setErrorMessage("That request couldn't be sent. Please check the email address and try again.")
      }
    })
  })

  if (sentTo) {
    return (
      <Alert role="status">
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            If <span className="font-semibold">{sentTo}</span> has a login, we&apos;ve sent a link to choose a new password. It works for an hour.
          </p>
          <p>It can take a few minutes to arrive. Check your spam folder too. If nothing comes, contact the school office.</p>
          <p>
            <Link href="/login" className="underline underline-offset-4">
              Back to log in
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
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="email" inputMode="email" />
        <div className="flex flex-wrap items-center gap-6">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Sending" : "Send reset link"}
          </Button>
          <Link href="/login" className="underline underline-offset-4">
            Back to log in
          </Link>
        </div>
      </FieldGroup>
    </form>
  )
}
