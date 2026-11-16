"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { resetPassword, setUserDisabled, type TemporaryCredentials } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { TemporaryPassword } from "./temporary-password"

export function UserRowActions({ userId, name, banned, isSelf }: { userId: string; name: string; banned: boolean; isSelf: boolean }) {
  const router = useRouter()
  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    startTransition(async () => {
      const result = await resetPassword(userId)
      if (result.ok) setCredentials(result.credentials)
      else toast.error(result.message)
    })
  }

  function toggleDisabled() {
    startTransition(async () => {
      const result = await setUserDisabled(userId, !banned)
      if (result.ok) {
        toast.success(banned ? `${name} can log in again` : `${name} can no longer log in`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={reset} disabled={pending}>
        Reset password
      </Button>
      {isSelf ? null : (
        <Button type="button" variant="outline" size="sm" onClick={toggleDisabled} disabled={pending}>
          {banned ? "Enable login" : "Disable login"}
        </Button>
      )}
      <Dialog open={credentials !== null} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset for {name}</DialogTitle>
            <DialogDescription>They have been signed out and need the new password to log in.</DialogDescription>
          </DialogHeader>
          {credentials ? <TemporaryPassword credentials={credentials} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
