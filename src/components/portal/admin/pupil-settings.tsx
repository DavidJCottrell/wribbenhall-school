"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { deletePupil, updatePupil } from "@/app/actions/admin"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createPupilSchema, yearGroups, type CreatePupilValues } from "@/lib/forms/schemas"
import type { ChildSummary } from "@/lib/portal/children"

import { ConfirmByTyping } from "./confirm-by-typing"

export function PupilSettings({ pupil, updateCount }: { pupil: ChildSummary; updateCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)

  const form = useForm<CreatePupilValues>({
    resolver: zodResolver(createPupilSchema),
    defaultValues: { firstName: pupil.firstName, lastName: pupil.lastName, yearGroup: pupil.yearGroup as CreatePupilValues["yearGroup"] },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updatePupil(pupil.id, values)
      if (result.ok) {
        toast.success("Details saved")
        router.refresh()
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  function confirmDelete(typed: string) {
    startTransition(async () => {
      const result = await deletePupil(pupil.id, typed)
      if (result.ok) {
        toast.success("Pupil deleted")
        router.push("/portal/admin/pupils")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-12">
      <section aria-labelledby="pupil-details" className="max-w-3xl">
        <h2 id="pupil-details" className="text-heading mb-6">
          Details
        </h2>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-7 sm:grid-cols-2">
              <TextField control={form.control} name="firstName" label="First name" autoComplete="off" />
              <TextField control={form.control} name="lastName" label="Last name" autoComplete="off" />
            </div>
            <SelectField control={form.control} name="yearGroup" label="Year group" options={yearGroups} />
            <div>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Save details
              </Button>
            </div>
          </FieldGroup>
        </form>
      </section>

      <section aria-labelledby="delete-pupil" className="max-w-3xl rounded-xl border border-destructive/40 p-6">
        <h2 id="delete-pupil" className="text-heading mb-2">
          Delete this pupil
        </h2>
        <p className="mb-6 text-muted-foreground">
          This permanently removes {pupil.firstName}&apos;s record, {updateCount === 1 ? "their 1 update" : `their ${updateCount} updates`} and all
          attachments. Parent and staff logins are kept. This can&apos;t be undone.
        </p>
        <Button type="button" variant="destructive" onClick={() => setDeleting(true)} disabled={pending}>
          Delete pupil
        </Button>
      </section>

      <ConfirmByTyping
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${pupil.firstName} ${pupil.lastName}?`}
        description="Everything recorded about this pupil will be removed for good."
        phrase={`${pupil.firstName} ${pupil.lastName}`}
        phraseLabel="Type the pupil's full name to confirm"
        confirmLabel="Delete pupil"
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
