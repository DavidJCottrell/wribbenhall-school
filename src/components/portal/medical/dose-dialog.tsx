"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { recordDose, voidDose } from "@/app/actions/medical"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { doseSchema, voidDoseSchema, type DoseValues, type VoidDoseValues } from "@/lib/forms/schemas"
import { allowedOutcomes } from "@/lib/medical/rules"
import { DOSE_OUTCOMES } from "@/lib/medical/types"

type DoseMedication = { id: string; name: string; dose: string; asRequired: boolean; scheduledTimes: string[] }

type Props = {
  medication: DoseMedication
  pupilName: string
  // The scheduled time this answers. Empty for as-required medication.
  scheduledFor?: string
  witnesses: { id: string; name: string }[]
  // Why it can't be given right now, shown as a warning. The server checks again.
  blockedReason?: string | null
  label?: string
  variant?: "default" | "outline"
}

function DoseForm({ medication, scheduledFor, witnesses, blockedReason, onSaved }: Omit<Props, "pupilName" | "label" | "variant"> & { onSaved: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const outcomes = allowedOutcomes(medication.asRequired)

  const form = useForm<DoseValues>({
    resolver: zodResolver(doseSchema),
    defaultValues: { outcome: "given", scheduledFor: scheduledFor ?? (medication.asRequired ? "" : (medication.scheduledTimes[0] ?? "")), dose: medication.dose, witnessedById: "", notes: "" },
    mode: "onTouched",
  })
  const outcome = useWatch({ control: form.control, name: "outcome" })
  const witness = useWatch({ control: form.control, name: "witnessedById" })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await recordDose(medication.id, values)
      if (result.ok) {
        toast.success("Recorded")
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
        {blockedReason && outcome === "given" ? (
          <Alert variant="destructive">
            <AlertDescription>{blockedReason}</AlertDescription>
          </Alert>
        ) : null}
        <SelectField control={form.control} id="dose-outcome" name="outcome" label="What happened" options={outcomes.map((value) => ({ value, label: DOSE_OUTCOMES[value] }))} />
        {!medication.asRequired ? (
          <SelectField control={form.control} id="dose-time" name="scheduledFor" label="Which dose" options={medication.scheduledTimes.map((time) => ({ value: time, label: time }))} />
        ) : null}
        {outcome === "given" ? <TextField control={form.control} id="dose-amount" name="dose" label="Dose given" /> : null}
        {witnesses.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="dose-witness" className="text-base">
              Witnessed by <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Select value={witness || "none"} onValueChange={(value) => form.setValue("witnessedById", value === "none" ? "" : value)}>
              <SelectTrigger id="dose-witness" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nobody</SelectItem>
                {witnesses.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <TextAreaField control={form.control} id="dose-notes" name="notes" label="Notes" optional rows={2} />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save entry
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function DoseDialog({ medication, pupilName, scheduledFor, witnesses, blockedReason, label = "Record", variant = "default" }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
        <span className="sr-only">
          {" "}
          {medication.name} for {pupilName}
          {scheduledFor ? ` at ${scheduledFor}` : ""}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle>
              {medication.name} for {pupilName}
            </DialogTitle>
            <DialogDescription>
              Entries can&apos;t be edited afterwards. If you make a mistake, void it with a reason.
            </DialogDescription>
          </DialogHeader>
          {open ? <DoseForm medication={medication} scheduledFor={scheduledFor} witnesses={witnesses} blockedReason={blockedReason} onSaved={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function VoidForm({ logId, onSaved }: { logId: string; onSaved: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<VoidDoseValues>({ resolver: zodResolver(voidDoseSchema), defaultValues: { reason: "" }, mode: "onTouched" })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await voidDose(logId, values)
      if (result.ok) {
        toast.success("Entry voided")
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
        <TextAreaField control={form.control} id="void-reason" name="reason" label="Why is this entry wrong?" rows={3} />
        <div>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? <Spinner /> : null}
            Void entry
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function VoidDoseButton({ logId, description }: { logId: string; description: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Void<span className="sr-only"> the entry for {description}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this entry?</DialogTitle>
            <DialogDescription>
              {description}. It stays on record, marked as voided with your name and reason. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {open ? <VoidForm logId={logId} onSaved={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
