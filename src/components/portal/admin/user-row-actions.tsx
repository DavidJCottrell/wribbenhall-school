"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { deleteUser, resetPassword, setUserDisabled, updateUser, type TemporaryCredentials } from "@/app/actions/logins"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import type { AdminUser } from "@/lib/admin/queries"
import { createUserSchema, type CreateUserValues } from "@/lib/forms/schemas"

import { ConfirmByTyping } from "./confirm-by-typing"
import { LoginFields } from "./login-fields"
import { TemporaryPassword } from "./temporary-password"

function EditUserForm({ person, isSelf, onSaved }: { person: AdminUser; isSelf: boolean; onSaved: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: person.name, email: person.email, kind: person.kind, permissions: person.permissions },
    mode: "onTouched",
  })
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateUser(person.id, values)
      if (result.ok) {
        toast.success("Changes saved")
        router.refresh()
        onSaved()
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <LoginFields control={form.control} idPrefix={`edit-${person.id}-`} lockKind={isSelf} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save changes
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function UserRowActions({ person, isSelf }: { person: AdminUser; isSelf: boolean }) {
  const router = useRouter()
  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pending, startTransition] = useTransition()

  function reset() {
    startTransition(async () => {
      const result = await resetPassword(person.id)
      if (result.ok) setCredentials(result.credentials)
      else toast.error(result.message)
    })
  }

  function toggleDisabled() {
    startTransition(async () => {
      const result = await setUserDisabled(person.id, !person.banned)
      if (result.ok) {
        toast.success(person.banned ? `${person.name} can log in again` : `${person.name} can no longer log in`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  function confirmDelete(typed: string) {
    startTransition(async () => {
      const result = await deleteUser(person.id, typed)
      if (result.ok) {
        toast.success(`${person.name}'s login was deleted`)
        setDeleting(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} disabled={pending}>
        Edit<span className="sr-only"> {person.name}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={reset} disabled={pending}>
        Reset password<span className="sr-only"> for {person.name}</span>
      </Button>
      {isSelf ? null : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={toggleDisabled} disabled={pending}>
            {person.banned ? "Enable login" : "Disable login"}
            <span className="sr-only"> for {person.name}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(true)} disabled={pending}>
            Delete<span className="sr-only"> {person.name}</span>
          </Button>
        </>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {person.name}</DialogTitle>
            <DialogDescription>Their password and sessions are not affected.</DialogDescription>
          </DialogHeader>
          <EditUserForm person={person} isSelf={isSelf} onSaved={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={credentials !== null} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset for {person.name}</DialogTitle>
            <DialogDescription>They have been signed out and need the new password to log in.</DialogDescription>
          </DialogHeader>
          {credentials ? <TemporaryPassword credentials={credentials} /> : null}
        </DialogContent>
      </Dialog>

      <ConfirmByTyping
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${person.name}'s login?`}
        description="They will be signed out and lose access for good. Updates they wrote stay on the pupils' records. This can't be undone. To stop someone logging in for now, disable the login instead."
        phrase={person.email}
        phraseLabel="Type their email address to confirm"
        confirmLabel="Delete login"
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
