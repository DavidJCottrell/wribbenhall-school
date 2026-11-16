"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { deletePupil, setPupilArchived, updatePupil } from "@/app/actions/pupils"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import type { PersonOption } from "@/lib/admin/queries"
import { ehcpStatuses, pupilProfileSchema, yearGroups, type PupilProfileValues } from "@/lib/forms/schemas"
import type { PupilProfile } from "@/lib/portal/pupils"

import { ConfirmByTyping } from "./confirm-by-typing"

// Radix selects can't hold an empty value, so "not set" travels as this word and is turned back into "" on save.
const NONE = "none"

const ehcpOptions = [{ value: NONE, label: "Not recorded" }, ...ehcpStatuses.map((status) => ({ value: status, label: status }))]

export function PupilProfileForm({ pupil, staff }: { pupil: PupilProfile; staff: PersonOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const keyWorkerOptions = [{ value: NONE, label: "No key worker" }, ...staff.map((person) => ({ value: person.id, label: person.name }))]

  const form = useForm<PupilProfileValues>({
    resolver: zodResolver(pupilProfileSchema),
    defaultValues: {
      firstName: pupil.firstName,
      lastName: pupil.lastName,
      preferredName: pupil.preferredName ?? "",
      yearGroup: pupil.yearGroup as PupilProfileValues["yearGroup"],
      dateOfBirth: pupil.dateOfBirth ?? "",
      admissionDate: pupil.admissionDate ?? "",
      leavingDate: pupil.leavingDate ?? "",
      keyWorkerId: pupil.keyWorkerId ?? NONE,
      ehcpStatus: (pupil.ehcpStatus ?? NONE) as PupilProfileValues["ehcpStatus"],
      localAuthority: pupil.localAuthority ?? "",
      ehcpReviewDue: pupil.ehcpReviewDue ?? "",
    },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updatePupil(pupil.id, {
        ...values,
        keyWorkerId: values.keyWorkerId === NONE ? "" : values.keyWorkerId,
        ehcpStatus: (values.ehcpStatus as string) === NONE ? "" : values.ehcpStatus,
      })
      if (result.ok) {
        toast.success("Details saved")
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
        <div className="grid gap-7 sm:grid-cols-3">
          <TextField control={form.control} id="pupil-firstName" name="firstName" label="First name" autoComplete="off" />
          <TextField control={form.control} id="pupil-lastName" name="lastName" label="Last name" autoComplete="off" />
          <TextField control={form.control} id="pupil-preferredName" name="preferredName" label="Preferred name" optional autoComplete="off" />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <SelectField control={form.control} id="pupil-yearGroup" name="yearGroup" label="Year group" options={yearGroups} />
          <SelectField control={form.control} id="pupil-keyWorkerId" name="keyWorkerId" label="Key worker" options={keyWorkerOptions} />
        </div>
        <div className="grid gap-7 sm:grid-cols-3">
          <TextField control={form.control} id="pupil-dateOfBirth" name="dateOfBirth" label="Date of birth" type="date" optional />
          <TextField control={form.control} id="pupil-admissionDate" name="admissionDate" label="Admission date" type="date" optional />
          <TextField control={form.control} id="pupil-leavingDate" name="leavingDate" label="Leaving date" type="date" optional />
        </div>
        <div className="grid gap-7 sm:grid-cols-3">
          <SelectField control={form.control} id="pupil-ehcpStatus" name="ehcpStatus" label="EHCP status" options={ehcpOptions} />
          <TextField control={form.control} id="pupil-localAuthority" name="localAuthority" label="Local authority" optional autoComplete="off" />
          <TextField control={form.control} id="pupil-ehcpReviewDue" name="ehcpReviewDue" label="Next EHCP review due" type="date" optional />
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save details
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function PupilDangerZone({ pupil, updateCount }: { pupil: PupilProfile; updateCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)

  function toggleArchived() {
    startTransition(async () => {
      const result = await setPupilArchived(pupil.id, !pupil.archived)
      if (result.ok) {
        toast.success(pupil.archived ? "Pupil restored" : "Pupil archived")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

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
    <div className="space-y-8">
      <section aria-labelledby="archive-pupil" className="max-w-3xl rounded-xl border border-border p-6">
        <h2 id="archive-pupil" className="text-heading mb-2">
          {pupil.archived ? "This pupil is archived" : "Archive this pupil"}
        </h2>
        <p className="mb-6 text-muted-foreground">
          {pupil.archived
            ? "Archived pupils are hidden from staff and parents, but their records are kept. Restore them to bring them back."
            : "Use this when a pupil leaves. They are hidden from staff and parents, but their records are kept."}
        </p>
        <Button type="button" variant="outline" onClick={toggleArchived} disabled={pending}>
          {pupil.archived ? "Restore pupil" : "Archive pupil"}
        </Button>
      </section>

      <section aria-labelledby="delete-pupil" className="max-w-3xl rounded-xl border border-destructive/40 p-6">
        <h2 id="delete-pupil" className="text-heading mb-2">
          Delete this pupil
        </h2>
        <p className="mb-6 text-muted-foreground">
          This permanently removes {pupil.firstName}&apos;s record, {updateCount === 1 ? "their 1 daily report" : `their ${updateCount} daily reports`}, their
          contacts and all attachments. Parent and staff logins are kept. This can&apos;t be undone. To keep the records, archive them instead.
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
