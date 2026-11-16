"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { addDayReport, updateDayReport } from "@/app/actions/day-reports"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToday } from "@/hooks/use-today"
import { REPORT_SESSIONS, dayReportSchema, type DayReportValues } from "@/lib/forms/schemas"
import type { DayReportView } from "@/lib/portal/day-reports"
import { MAX_FILES_PER_RECORD, formatBytes } from "@/lib/uploads"

import { AttachmentPicker } from "./attachment-picker"
import { useFileUploads } from "./use-file-uploads"

type Props = {
  childId: string
  // When set, the form edits this report instead of adding a new one.
  report?: DayReportView
  onSaved?: () => void
  // Keeps field ids unique when two of these forms are on the page at once.
  idPrefix?: string
}

export function DayReportForm({ childId, report, onSaved, idPrefix = "" }: Props) {
  const router = useRouter()
  const today = useToday()
  const [pending, startTransition] = useTransition()
  const { files, setFiles, progress, uploadAll, reset: resetFiles } = useFileUploads(childId, "day_report")
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())

  const form = useForm<DayReportValues>({
    resolver: zodResolver(dayReportSchema),
    defaultValues: report
      ? {
          title: report.title,
          reportDate: report.reportDate,
          session: (report.session ?? "") as DayReportValues["session"],
          subject: report.subject ?? "",
          body: report.body,
          visibleToParents: report.visibleToParents,
        }
      : { title: "", reportDate: "", session: "", subject: "", body: "", visibleToParents: true },
    mode: "onTouched",
  })

  useEffect(() => {
    if (!report && today && !form.getValues("reportDate")) form.setValue("reportDate", today)
  }, [report, today, form])

  const existingFiles = report?.files ?? []
  const keptCount = existingFiles.filter((file) => !removedIds.has(file.id)).length

  function toggleRemoved(attachmentId: string) {
    setRemovedIds((current) => {
      const next = new Set(current)
      if (!next.delete(attachmentId)) next.add(attachmentId)
      return next
    })
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const attachments = await uploadAll()
      if (!attachments) return

      const result = report
        ? await updateDayReport(report.id, values, attachments, [...removedIds])
        : await addDayReport(childId, values, attachments)
      if (result.ok) {
        toast.success(report ? "Changes saved" : "Report saved")
        if (!report) form.reset({ title: "", reportDate: today ?? "", session: "", subject: "", body: "", visibleToParents: true })
        resetFiles()
        router.refresh()
        onSaved?.()
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
          <TextField control={form.control} id={`${idPrefix}title`} name="title" label="Title" />
          <TextField control={form.control} id={`${idPrefix}reportDate`} name="reportDate" label="Date" type="date" />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <SelectField
            control={form.control}
            id={`${idPrefix}session`}
            name="session"
            label="Part of the day"
            options={REPORT_SESSIONS}
            placeholder="Not specified"
          />
          <TextField control={form.control} id={`${idPrefix}subject`} name="subject" label="Subject or activity" optional />
        </div>
        <TextAreaField control={form.control} id={`${idPrefix}body`} name="body" label="Report" rows={5} />
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
        <AttachmentPicker
          files={files}
          onChange={setFiles}
          disabled={pending}
          maxFiles={MAX_FILES_PER_RECORD - keptCount}
        />
        <CheckboxField
          control={form.control}
          id={`${idPrefix}visibleToParents`}
          name="visibleToParents"
          label="Show this to parents and carers"
          description="Untick to keep it as a staff-only note."
        />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {progress ?? (pending ? "Saving" : report ? "Save changes" : "Save report")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
