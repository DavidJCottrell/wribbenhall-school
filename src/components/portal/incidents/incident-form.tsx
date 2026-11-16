"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { recordIncident, updateIncident } from "@/app/actions/incidents"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useToday } from "@/hooks/use-today"
import { incidentSchema, type IncidentValues } from "@/lib/forms/schemas"
import { keepsInjuryDetails, keepsInterventionDetails } from "@/lib/incidents/rules"
import { INCIDENT_TYPES, INFORMED_HOW, INVOLVEMENT_ROLES, SEVERITIES, type InvolvementRole } from "@/lib/incidents/types"
import type { IncidentDetail } from "@/lib/portal/incidents"
import { MAX_FILES_PER_RECORD, formatBytes } from "@/lib/uploads"

import { AttachmentPicker } from "../attachment-picker"
import { useFileUploads } from "../use-file-uploads"

type Option = { value: string; label: string }
const toOptions = (labels: Record<string, string>): Option[] => Object.entries(labels).map(([value, label]) => ({ value, label }))

type Props = {
  pupil: { id: string; name: string }
  otherPupils: { id: string; name: string }[]
  // When set, the form edits this incident instead of recording a new one.
  incident?: IncidentDetail
}

const blankValues: IncidentValues = {
  occurredOn: "",
  occurredTime: "",
  type: "behaviour",
  severity: "low",
  location: "",
  summary: "",
  description: "",
  antecedent: "",
  behaviour: "",
  response: "",
  outcome: "",
  injury: "",
  firstAid: "",
  interventionTechnique: "",
  interventionMinutes: "",
  interventionStaff: "",
  interventionDebrief: "",
  parentsInformedOn: "",
  parentsInformedBy: "",
  parentsInformedHow: "",
  involved: [],
}

function valuesFrom(incident: IncidentDetail): IncidentValues {
  return {
    occurredOn: incident.occurredOn,
    occurredTime: incident.occurredTime,
    type: incident.type,
    severity: incident.severity,
    location: incident.location ?? "",
    summary: incident.summary,
    description: incident.description,
    antecedent: incident.antecedent ?? "",
    behaviour: incident.behaviour ?? "",
    response: incident.response ?? "",
    outcome: incident.outcome ?? "",
    injury: incident.injury ?? "",
    firstAid: incident.firstAid ?? "",
    interventionTechnique: incident.interventionTechnique ?? "",
    interventionMinutes: incident.interventionMinutes === null ? "" : String(incident.interventionMinutes),
    interventionStaff: incident.interventionStaff ?? "",
    interventionDebrief: incident.interventionDebrief ?? "",
    parentsInformedOn: incident.parentsInformedOn ?? "",
    parentsInformedBy: incident.parentsInformedBy ?? "",
    parentsInformedHow: (incident.parentsInformedHow ?? "") as IncidentValues["parentsInformedHow"],
    involved: incident.involved.map(({ childId, role }) => ({ childId, role })),
  }
}

const currentClockTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

export function IncidentForm({ pupil, otherPupils, incident }: Props) {
  const router = useRouter()
  const today = useToday()
  const [pending, startTransition] = useTransition()
  const { files, setFiles, progress, uploadAll } = useFileUploads(pupil.id, "incident")
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())

  const form = useForm<IncidentValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: incident ? valuesFrom(incident) : blankValues,
    mode: "onTouched",
  })

  useEffect(() => {
    if (incident || !today) return
    if (!form.getValues("occurredOn")) form.setValue("occurredOn", today)
    if (!form.getValues("occurredTime")) form.setValue("occurredTime", currentClockTime())
  }, [incident, today, form])

  const type = useWatch({ control: form.control, name: "type" })
  const involved = useWatch({ control: form.control, name: "involved" })
  const existingFiles = incident?.files ?? []
  const keptCount = existingFiles.filter((file) => !removedIds.has(file.id)).length

  function toggleRemoved(fileId: string) {
    setRemovedIds((current) => {
      const next = new Set(current)
      if (!next.delete(fileId)) next.add(fileId)
      return next
    })
  }

  function setInvolvement(childId: string, role: InvolvementRole | "none") {
    const others = involved.filter((entry) => entry.childId !== childId)
    form.setValue("involved", role === "none" ? others : [...others, { childId, role }], { shouldDirty: true })
  }

  function clearInformed() {
    form.setValue("parentsInformedOn", "", { shouldDirty: true })
    form.setValue("parentsInformedBy", "", { shouldDirty: true })
    form.setValue("parentsInformedHow", "", { shouldDirty: true })
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const uploads = await uploadAll()
      if (!uploads) return

      const result = incident
        ? await updateIncident(incident.id, values, uploads, [...removedIds])
        : await recordIncident(pupil.id, values, uploads)
      if (result.ok) {
        toast.success(incident ? "Changes saved" : "Incident recorded")
        router.push(`/portal/incidents/${result.id}`)
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
          <TextField control={form.control} name="occurredOn" label="Date" type="date" />
          <TextField control={form.control} name="occurredTime" label="Time" type="time" />
          <SelectField control={form.control} name="type" label="Type of incident" options={toOptions(INCIDENT_TYPES)} />
          <SelectField control={form.control} name="severity" label="How serious" options={toOptions(SEVERITIES)} />
        </div>
        <TextField control={form.control} name="location" label="Where it happened" optional />
        <TextField
          control={form.control}
          name="summary"
          label="Summary"
          description="One line, so people can recognise it in a list."
        />
        <TextAreaField control={form.control} name="description" label="What happened" rows={6} />

        <FieldSet>
          <FieldLegend>Before, during and after</FieldLegend>
          <FieldGroup>
            <TextAreaField control={form.control} name="antecedent" label="What led up to it" optional rows={3} />
            <TextAreaField control={form.control} name="behaviour" label="What the pupil did" optional rows={3} />
            <TextAreaField control={form.control} name="response" label="How staff responded" optional rows={3} />
            <TextAreaField control={form.control} name="outcome" label="How it ended" optional rows={3} />
          </FieldGroup>
        </FieldSet>

        {keepsInjuryDetails(type) ? (
          <FieldSet>
            <FieldLegend>Injury and first aid</FieldLegend>
            <FieldGroup>
              <TextAreaField control={form.control} name="injury" label="Injury" optional rows={2} />
              <TextAreaField control={form.control} name="firstAid" label="First aid given" optional rows={2} />
            </FieldGroup>
          </FieldSet>
        ) : null}

        {keepsInterventionDetails(type) ? (
          <FieldSet>
            <FieldLegend>Physical intervention</FieldLegend>
            <FieldGroup>
              <div className="grid gap-7 sm:grid-cols-2">
                <TextField control={form.control} name="interventionTechnique" label="Technique used" optional />
                <TextField control={form.control} name="interventionMinutes" label="Minutes" optional inputMode="numeric" />
              </div>
              <TextField control={form.control} name="interventionStaff" label="Staff involved" optional />
              <TextAreaField control={form.control} name="interventionDebrief" label="Debrief with the pupil and staff" optional rows={3} />
            </FieldGroup>
          </FieldSet>
        ) : null}

        <FieldSet>
          <FieldLegend>Parents informed</FieldLegend>
          <FieldGroup>
            <div className="grid gap-7 sm:grid-cols-3">
              <TextField control={form.control} name="parentsInformedOn" label="Date" type="date" optional />
              <TextField control={form.control} name="parentsInformedBy" label="Told by" optional />
              <SelectField control={form.control} name="parentsInformedHow" label="How" options={toOptions(INFORMED_HOW)} placeholder="Not yet" />
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={clearInformed} disabled={pending}>
                Parents have not been told yet
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>

        {otherPupils.length > 0 ? (
          <FieldSet>
            <FieldLegend>Other pupils</FieldLegend>
            <p className="text-sm text-muted-foreground">Anyone else who was involved or saw it. This is never shown to parents.</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {otherPupils.map((other) => {
                const current = involved.find((entry) => entry.childId === other.id)?.role ?? "none"
                const id = `involved-${other.id}`
                return (
                  <li key={other.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <Label htmlFor={id} className="text-base font-normal">
                      {other.name}
                    </Label>
                    <Select value={current} onValueChange={(value) => setInvolvement(other.id, value as InvolvementRole | "none")}>
                      <SelectTrigger id={id} className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not involved</SelectItem>
                        {Object.entries(INVOLVEMENT_ROLES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                )
              })}
            </ul>
          </FieldSet>
        ) : null}

        {existingFiles.length > 0 ? (
          <div className="space-y-2">
            <p className="text-base font-medium">Current attachments</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {existingFiles.map((file) => {
                const removed = removedIds.has(file.id)
                return (
                  <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className={removed ? "truncate text-muted-foreground line-through" : "truncate"}>
                      {file.filename} <span className="text-sm text-muted-foreground">({formatBytes(file.sizeBytes)})</span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => toggleRemoved(file.id)}>
                      {removed ? "Keep" : "Remove"}
                      <span className="sr-only"> {file.filename}</span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        <AttachmentPicker files={files} onChange={setFiles} disabled={pending} maxFiles={MAX_FILES_PER_RECORD - keptCount} />

        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {progress ?? (pending ? "Saving" : incident ? "Save changes" : "Record incident")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
