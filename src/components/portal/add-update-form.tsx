"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import { useEffect, useState, useTransition } from "react"
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
import { attachmentPrefix, safeStorageName, type UploadedAttachment } from "@/lib/uploads"

import { AttachmentPicker } from "./attachment-picker"

export function AddUpdateForm({ childId }: { childId: string }) {
  const router = useRouter()
  const today = useToday()
  const [pending, startTransition] = useTransition()
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  // Kept between attempts, so a failed save doesn't upload the same files again.
  const [uploaded] = useState(() => new Map<File, UploadedAttachment>())

  const form = useForm<ChildUpdateValues>({
    resolver: zodResolver(childUpdateSchema),
    defaultValues: { title: "", occurredOn: "", body: "", visibleToParents: true },
    mode: "onTouched",
  })

  useEffect(() => {
    if (today && !form.getValues("occurredOn")) form.setValue("occurredOn", today)
  }, [today, form])

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

      const result = await addChildUpdate(childId, values, attachments)
      if (result.ok) {
        toast.success("Update saved")
        form.reset({ title: "", occurredOn: today ?? "", body: "", visibleToParents: true })
        setFiles([])
        uploaded.clear()
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
        <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
        <CheckboxField
          control={form.control}
          name="visibleToParents"
          label="Show this to parents and carers"
          description="Untick to keep it as a staff-only note."
        />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {progress ?? (pending ? "Saving update" : "Save update")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
