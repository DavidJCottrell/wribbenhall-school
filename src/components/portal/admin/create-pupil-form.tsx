"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createPupil } from "@/app/actions/pupils"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createPupilSchema, yearGroups, type CreatePupilValues } from "@/lib/forms/schemas"

export function CreatePupilForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<CreatePupilValues>({
    resolver: zodResolver(createPupilSchema),
    defaultValues: { firstName: "", lastName: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createPupil(values)
      if (result.ok) {
        router.push(`/portal/admin/pupils/${result.pupilId}`)
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="firstName" label="First name" autoComplete="off" />
          <TextField control={form.control} name="lastName" label="Last name" autoComplete="off" />
        </div>
        <SelectField control={form.control} name="yearGroup" label="Year group" options={yearGroups} />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Adding pupil" : "Add pupil"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
