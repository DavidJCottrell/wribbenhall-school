"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { addChildUpdate } from "@/app/actions/child-updates"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToday } from "@/hooks/use-today"
import { childUpdateSchema, type ChildUpdateValues } from "@/lib/forms/schemas"

export function AddUpdateForm({ childId }: { childId: string }) {
  const router = useRouter()
  const today = useToday()
  const [pending, startTransition] = useTransition()

  const form = useForm<ChildUpdateValues>({
    resolver: zodResolver(childUpdateSchema),
    defaultValues: { title: "", occurredOn: "", body: "", visibleToParents: true },
    mode: "onTouched",
  })

  useEffect(() => {
    if (today && !form.getValues("occurredOn")) form.setValue("occurredOn", today)
  }, [today, form])

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addChildUpdate(childId, values)
      if (result.ok) {
        toast.success("Update saved")
        form.reset({ title: "", occurredOn: today ?? "", body: "", visibleToParents: true })
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
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="title" label="Title" />
          <TextField control={form.control} name="occurredOn" label="Date" type="date" />
        </div>
        <TextAreaField control={form.control} name="body" label="Update" rows={5} />
        <CheckboxField
          control={form.control}
          name="visibleToParents"
          label="Show this to parents and carers"
          description="Untick to keep it as a staff-only note."
        />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Saving update" : "Save update"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
