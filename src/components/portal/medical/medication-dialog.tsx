"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { deleteMedication, saveMedication } from "@/app/actions/medical"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { medicationSchema, type MedicationValues } from "@/lib/forms/schemas"
import { MEDICATION_ROUTES } from "@/lib/medical/types"
import type { MedicationView } from "@/lib/portal/medical"

const routeOptions = Object.entries(MEDICATION_ROUTES).map(([value, label]) => ({ value, label }))

function MedicationForm({ childId, medication, onSaved }: { childId: string; medication?: MedicationView; onSaved: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<MedicationValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: medication
      ? {
          name: medication.name,
          dose: medication.dose,
          route: medication.route,
          frequency: medication.frequency ?? "",
          scheduledTimes: medication.scheduledTimes.join(", "),
          asRequired: medication.asRequired,
          maxDailyDoses: medication.maxDailyDoses === null ? "" : String(medication.maxDailyDoses),
          prescriber: medication.prescriber ?? "",
          startsOn: medication.startsOn ?? "",
          expiresOn: medication.expiresOn ?? "",
          storage: medication.storage ?? "",
          consentOn: medication.consentOn ?? "",
          notes: medication.notes ?? "",
          active: medication.active,
        }
      : {
          name: "", dose: "", route: "oral", frequency: "", scheduledTimes: "", asRequired: false, maxDailyDoses: "", prescriber: "",
          startsOn: "", expiresOn: "", storage: "", consentOn: "", notes: "", active: true,
        },
    mode: "onTouched",
  })
  const asRequired = useWatch({ control: form.control, name: "asRequired" })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveMedication(childId, medication?.id ?? null, values)
      if (result.ok) {
        toast.success("Saved")
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
        <TextField control={form.control} id="med-name" name="name" label="Medication" />
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} id="med-dose" name="dose" label="Dose" description="For example 5 ml, or 2 puffs." />
          <SelectField control={form.control} id="med-route" name="route" label="How it is taken" options={routeOptions} />
        </div>
        <CheckboxField control={form.control} id="med-as-required" name="asRequired" label="Only given when needed" description="It has no set times." />
        {asRequired ? (
          <TextField control={form.control} id="med-max" name="maxDailyDoses" label="Most doses in one day" optional inputMode="numeric" />
        ) : (
          <TextField control={form.control} id="med-times" name="scheduledTimes" label="Times each school day" description="For example 08:30, 12:30." />
        )}
        <TextField control={form.control} id="med-frequency" name="frequency" label="Frequency, in words" optional />
        <div className="grid gap-7 sm:grid-cols-3">
          <TextField control={form.control} id="med-consent" name="consentOn" label="Parental consent given on" type="date" optional description="Nothing can be given without it." />
          <TextField control={form.control} id="med-starts" name="startsOn" label="Starts" type="date" optional />
          <TextField control={form.control} id="med-expires" name="expiresOn" label="Expires" type="date" optional />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} id="med-prescriber" name="prescriber" label="Prescriber" optional />
          <TextField control={form.control} id="med-storage" name="storage" label="Where it is kept" optional />
        </div>
        <TextAreaField control={form.control} id="med-notes" name="notes" label="Notes" optional rows={3} />
        <CheckboxField control={form.control} id="med-active" name="active" label="Current" description="Untick when it has stopped. The record of what was given stays." />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Saving" : "Save"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function MedicationDialog({ childId, medication }: { childId: string; medication?: MedicationView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!medication) return
    startTransition(async () => {
      const result = await deleteMedication(medication.id)
      if (result.ok) {
        toast.success("Deleted")
        setConfirmingDelete(false)
        router.refresh()
      } else {
        toast.error(result.message)
        setConfirmingDelete(false)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {medication ? "Edit" : "Add medication"}
          {medication ? <span className="sr-only"> {medication.name}</span> : null}
        </Button>
        {medication ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
            Delete<span className="sr-only"> {medication.name}</span>
          </Button>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{medication ? "Edit" : "Add"} medication</DialogTitle>
            <DialogDescription>Only medication the parents have consented to can be given.</DialogDescription>
          </DialogHeader>
          {open ? <MedicationForm childId={childId} medication={medication} onSaved={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
      {medication ? (
        <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{medication.name}&rdquo;?</DialogTitle>
              <DialogDescription>
                This only works if nothing has been recorded against it. Otherwise mark it as no longer current, so the record stays.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)} disabled={pending}>
                Keep it
              </Button>
              <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Spinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
