"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"

export function SignOutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      await authClient.signOut()
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" onClick={signOut} disabled={pending}>
      {pending ? "Logging out" : "Log out"}
    </Button>
  )
}
