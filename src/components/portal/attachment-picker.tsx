"use client"

import { FileIcon, XIcon } from "lucide-react"
import { useId, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP,
  MAX_ATTACHMENTS_PER_UPDATE,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isAllowedAttachmentType,
} from "@/lib/uploads"

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
}

function problemWith(file: File) {
  if (!isAllowedAttachmentType(file.type)) return `${file.name} isn't a type we can accept`
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}`
  return null
}

export function AttachmentPicker({ files, onChange, disabled, maxFiles = MAX_ATTACHMENTS_PER_UPDATE }: Props) {
  const inputId = useId()
  const [problems, setProblems] = useState<string[]>([])

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    event.target.value = ""

    const found: string[] = []
    const accepted: File[] = []
    for (const file of chosen) {
      const problem = problemWith(file)
      if (problem) found.push(problem)
      else accepted.push(file)
    }

    const combined = [...files, ...accepted]
    if (combined.length > maxFiles) {
      found.push(`You can attach up to ${MAX_ATTACHMENTS_PER_UPDATE} files to one update`)
    }

    setProblems(found)
    onChange(combined.slice(0, maxFiles))
  }

  return (
    <Field data-invalid={problems.length > 0}>
      <FieldLabel htmlFor={inputId} className="text-base">
        Attachments<span className="font-normal text-muted-foreground"> (optional)</span>
      </FieldLabel>
      <FieldDescription>{ATTACHMENT_HELP}</FieldDescription>
      <Input
        id={inputId}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        onChange={handleSelection}
        disabled={disabled || files.length >= maxFiles}
        aria-invalid={problems.length > 0}
      />
      {problems.length > 0 ? (
        <FieldError>
          <ul className="list-disc pl-5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </FieldError>
      ) : null}
      {files.length > 0 ? (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon aria-hidden="true" className="size-4 shrink-0 text-severn" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{formatBytes(file.size)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(files.filter((candidate) => candidate !== file))}
              >
                <XIcon aria-hidden="true" />
                <span className="sr-only">Remove {file.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  )
}
