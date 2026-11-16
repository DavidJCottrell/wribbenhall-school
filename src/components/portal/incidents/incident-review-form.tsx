"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { reviewIncident } from "@/app/actions/incidents"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, SelectField, TextAreaField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { incidentReviewSchema, type IncidentReviewValues } from "@/lib/forms/schemas"
import { INCIDENT_STATUSES } from "@/lib/incidents/types"
import type { IncidentDetail } from "@/lib/portal/incidents"

export function IncidentReviewForm({ incident }: { incident: IncidentDetail }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<IncidentReviewValues>({
    resolver: zodResolver(incidentReviewSchema),
    defaultValues: {
      status: incident.status,
      reviewNotes: incident.reviewNotes ?? "",
      shareWithParents: incident.sharedWithParents,
      parentSummary: incident.parentSummary ?? "",
    },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await reviewIncident(incident.id, values)
      if (result.ok) {
        toast.success("Review saved")
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
        <SelectField
          control={form.control}
          name="status"
          label="Status"
          description="Closing an incident signs it off with your name and today's date."
          options={Object.entries(INCIDENT_STATUSES).map(([value, label]) => ({ value, label }))}
        />
        <TextAreaField control={form.control} name="reviewNotes" label="Review notes" description="Staff only." optional rows={3} />
        <TextAreaField
          control={form.control}
          name="parentSummary"
          label="Summary for parents"
          description="Written for parents. It must not name other pupils or include staff-only detail."
          optional
          rows={4}
        />
        <CheckboxField
          control={form.control}
          name="shareWithParents"
          label="Share this summary with the pupil's parents and carers"
          description="They will see the date, the type of incident and this summary, nothing else."
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save review
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
