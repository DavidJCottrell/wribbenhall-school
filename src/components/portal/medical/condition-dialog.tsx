"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { deleteCondition, saveCondition } from "@/app/actions/medical"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { conditionSchema, type ConditionValues } from "@/lib/forms/schemas"
import { CONDITION_KINDS, CONDITION_SEVERITIES } from "@/lib/medical/types"
import type { ConditionView } from "@/lib/portal/medical"
import { MAX_FILES_PER_RECORD, formatBytes } from "@/lib/uploads"

import { AttachmentPicker } from "../attachment-picker"
import { useFileUploads } from "../use-file-uploads"

const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))

function ConditionForm({ childId, condition, onSaved }: { childId: string; condition?: ConditionView; onSaved: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { files, setFiles, progress, uploadAll } = useFileUploads(childId, "medical")
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())

  const form = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: condition
      ? {
          kind: condition.kind,
          name: condition.name,
          severity: condition.severity,
          signs: condition.signs ?? "",
          actionPlan: condition.actionPlan ?? "",
          alert: condition.alert,
          active: condition.active,
          visibleToParents: condition.visibleToParents,
        }
      : { kind: "condition", name: "", severity: "mild", signs: "", actionPlan: "", alert: false, active: true, visibleToParents: true },
    mode: "onTouched",
  })

  const existingFiles = condition?.files ?? []
  const keptCount = existingFiles.filter((file) => !removedIds.has(file.id)).length

  function toggleRemoved(fileId: string) {
    setRemovedIds((current) => {
      const next = new Set(current)
      if (!next.delete(fileId)) next.add(fileId)
      return next
    })
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const uploads = await uploadAll()
      if (!uploads) return
      const result = await saveCondition(childId, condition?.id ?? null, values, uploads, [...removedIds])
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
        <div className="grid gap-7 sm:grid-cols-2">
          <SelectField control={form.control} id="condition-kind" name="kind" label="Kind" options={toOptions(CONDITION_KINDS)} />
          <SelectField control={form.control} id="condition-severity" name="severity" label="Severity" options={toOptions(CONDITION_SEVERITIES)} />
        </div>
        <TextField control={form.control} id="condition-name" name="name" label="Name" />
        <TextAreaField control={form.control} id="condition-signs" name="signs" label="Signs to look for" optional rows={3} />
        <TextAreaField control={form.control} id="condition-plan" name="actionPlan" label="Action plan" description="What staff should do." optional rows={4} />
        {existingFiles.length > 0 ? (
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
        ) : null}
        <AttachmentPicker files={files} onChange={setFiles} disabled={pending} maxFiles={MAX_FILES_PER_RECORD - keptCount} />
        <CheckboxField
          control={form.control}
          id="condition-alert"
          name="alert"
          label="Show as an alert to every member of staff"
          description="Use for anything staff must know straight away, such as anaphylaxis."
        />
        <CheckboxField control={form.control} id="condition-parents" name="visibleToParents" label="Show the name and severity to parents" />
        <CheckboxField control={form.control} id="condition-active" name="active" label="Current" description="Untick when it no longer applies." />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {progress ?? (pending ? "Saving" : "Save")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ConditionDialog({ childId, condition }: { childId: string; condition?: ConditionView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!condition) return
    startTransition(async () => {
      const result = await deleteCondition(condition.id)
      if (result.ok) {
        toast.success("Deleted")
        setConfirmingDelete(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {condition ? "Edit" : "Add a condition, allergy or dietary need"}
          {condition ? <span className="sr-only"> {condition.name}</span> : null}
        </Button>
        {condition ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
            Delete<span className="sr-only"> {condition.name}</span>
          </Button>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{condition ? "Edit" : "Add"} a medical record</DialogTitle>
            <DialogDescription>Conditions, allergies and dietary needs.</DialogDescription>
          </DialogHeader>
          {open ? <ConditionForm childId={childId} condition={condition} onSaved={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
      {condition ? (
        <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{condition.name}&rdquo;?</DialogTitle>
              <DialogDescription>It and its files will be permanently removed. If it no longer applies, untick &ldquo;Current&rdquo; instead.</DialogDescription>
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
