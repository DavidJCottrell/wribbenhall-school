"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { addChildUpdate, updateChildUpdate } from "@/app/actions/child-updates"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, TextAreaField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToday } from "@/hooks/use-today"
import { childUpdateSchema, type ChildUpdateValues } from "@/lib/forms/schemas"
import type { ChildUpdateView } from "@/lib/portal/children"
import { MAX_ATTACHMENTS_PER_UPDATE, attachmentPrefix, formatBytes, safeStorageName, type UploadedAttachment } from "@/lib/uploads"

import { AttachmentPicker } from "./attachment-picker"

type Props = {
  childId: string
  // When set, the form edits this update instead of adding a new one.
  update?: ChildUpdateView
  onSaved?: () => void
  // Keeps field ids unique when two of these forms are on the page at once.
  idPrefix?: string
}

export function UpdateForm({ childId, update, onSaved, idPrefix = "" }: Props) {
  const router = useRouter()
  const today = useToday()
  const [pending, startTransition] = useTransition()
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  // Kept between attempts, so a failed save doesn't upload the same files again.
  const [uploaded] = useState(() => new Map<File, UploadedAttachment>())
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())

  const form = useForm<ChildUpdateValues>({
    resolver: zodResolver(childUpdateSchema),
    defaultValues: update
      ? { title: update.title, occurredOn: update.occurredOn, body: update.body, visibleToParents: update.visibleToParents }
      : { title: "", occurredOn: "", body: "", visibleToParents: true },
    mode: "onTouched",
  })

  useEffect(() => {
    if (!update && today && !form.getValues("occurredOn")) form.setValue("occurredOn", today)
  }, [update, today, form])

  const existingFiles = update?.attachments ?? []
  const keptCount = existingFiles.filter((file) => !removedIds.has(file.id)).length

  function toggleRemoved(attachmentId: string) {
    setRemovedIds((current) => {
      const next = new Set(current)
      if (!next.delete(attachmentId)) next.add(attachmentId)
      return next
    })
  }

  async function uploadFiles(): Promise<UploadedAttachment[] | null> {
    const results: UploadedAttachment[] = []
    for (const [index, file] of files.entries()) {
      let result = uploaded.get(file)
      if (!result) {
        setProgress(`Uploading file ${index + 1} of ${files.length}`)
        try {
          const blob = await upload(`${attachmentPrefix(childId)}${crypto.randomUUID()}-${safeStorageName(file.name)}`, file, {
            access: "private",
            handleUploadUrl: "/api/portal/uploads",
            clientPayload: JSON.stringify({ childId }),
          })
          result = { pathname: blob.pathname, filename: file.name }
          uploaded.set(file, result)
        } catch {
          toast.error(`${file.name} couldn't be uploaded. Please try again.`)
          return null
        }
      }
      results.push(result)
    }
    return results
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const attachments = await uploadFiles()
      setProgress(null)
      if (!attachments) return

      const result = update
        ? await updateChildUpdate(update.id, values, attachments, [...removedIds])
        : await addChildUpdate(childId, values, attachments)
      if (result.ok) {
        toast.success(update ? "Changes saved" : "Update saved")
        if (!update) form.reset({ title: "", occurredOn: today ?? "", body: "", visibleToParents: true })
        setFiles([])
        uploaded.clear()
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
          <TextField control={form.control} id={`${idPrefix}occurredOn`} name="occurredOn" label="Date" type="date" />
        </div>
        <TextAreaField control={form.control} id={`${idPrefix}body`} name="body" label="Update" rows={5} />
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
          maxFiles={MAX_ATTACHMENTS_PER_UPDATE - keptCount}
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
            {progress ?? (pending ? "Saving" : update ? "Save changes" : "Save update")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
