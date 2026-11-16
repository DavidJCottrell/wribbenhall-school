"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { TextField } from "@/components/forms/fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/auth-client"
import { loginSchema, type LoginValues } from "@/lib/forms/schemas"

const TOO_MANY_ATTEMPTS = 429
const SERVER_ERROR = 500

function loginErrorMessage(status: number) {
  if (status === TOO_MANY_ATTEMPTS) return "Too many attempts. Please wait a few minutes and try again."
  if (status >= SERVER_ERROR) return "Something went wrong on our side. Please try again in a moment, or contact the school office."
  return "The email address or password is incorrect."
}

export function LoginForm({ destination }: { destination: string }) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null)
    startTransition(async () => {
      const { error } = await authClient.signIn.email(values)
      if (!error) {
        router.replace(destination)
        router.refresh()
        return
      }
      setErrorMessage(loginErrorMessage(error.status))
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {errorMessage ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="username" inputMode="email" />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Logging in" : "Log in"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
