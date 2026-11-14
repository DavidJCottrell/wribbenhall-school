"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { submitJobApplication } from "@/app/actions/forms"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, HoneypotField, TextAreaField, TextField } from "@/components/forms/fields"
import { FormSuccess } from "@/components/forms/form-success"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES, jobApplicationSchema, type JobApplicationValues } from "@/lib/forms/schemas"

export function JobApplicationForm({
  vacancySlug,
  vacancyTitle,
  applicationFormUrl,
}: {
  vacancySlug: string
  vacancyTitle: string
  applicationFormUrl?: string
}) {
  const emptyValues: JobApplicationValues = {
    vacancySlug,
    fullName: "",
    email: "",
    phone: "",
    message: "",
    rightToWork: false,
    declaration: false,
    website: "",
  }

  const [reference, setReference] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const uploadInput = useRef<HTMLInputElement>(null)

  const form = useForm<JobApplicationValues>({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: emptyValues,
    mode: "onTouched",
  })

  function checkUpload() {
    const file = uploadInput.current?.files?.[0]
    if (!file) {
      setUploadError("Attach your completed application form")
      return false
    }
    if (!UPLOAD_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Upload a PDF or Word document under 5 MB")
      return false
    }
    setUploadError(null)
    return true
  }

  const submitValues = (values: JobApplicationValues) => {
    if (!checkUpload()) {
      uploadInput.current?.focus()
      return
    }

    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) formData.append(key, String(value ?? ""))
    const upload = uploadInput.current?.files?.[0]
    if (upload) formData.append("applicationForm", upload)

    startTransition(async () => {
      const result = await submitJobApplication(formData)
      if (result.ok) {
        setReference(result.reference)
        form.reset(emptyValues)
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        if (result.fieldErrors?.applicationForm?.[0]) setUploadError(result.fieldErrors.applicationForm[0])
        toast.error(result.message)
      }
    })
  }

  if (reference) {
    return (
      <FormSuccess title="Application sent" reference={reference} resetLabel="Back to the form" onReset={() => setReference(null)}>
        <p>
          Thank you for applying for the {vacancyTitle} role. We&apos;ll be in touch after the closing date.
        </p>
      </FormSuccess>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        checkUpload()
        form.handleSubmit(submitValues)(event)
      }}
      noValidate className="relative">
      <FieldGroup>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="fullName" label="Full name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="email" />
        </div>
        <TextField control={form.control} name="phone" label="Phone number" type="tel" autoComplete="tel" className="sm:max-w-xs" />
        <Field data-invalid={Boolean(uploadError)}>
          <FieldLabel htmlFor="applicationForm" className="text-base">
            Completed application form
          </FieldLabel>
          <FieldDescription>
            Word or PDF, up to 5 MB. We cannot accept CVs alone.
            {applicationFormUrl ? (
              <>
                {" "}
                <a href={applicationFormUrl} target="_blank" rel="noopener" className="font-semibold text-severn underline underline-offset-4">
                  Get the application form
                </a>
              </>
            ) : null}
          </FieldDescription>
          <Input
            ref={uploadInput}
            id="applicationForm"
            name="applicationForm"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={checkUpload}
            aria-invalid={Boolean(uploadError)}
            className="h-auto py-2 file:mr-3 file:h-8 file:rounded-md file:bg-secondary file:px-3"
          />
          <FieldError>{uploadError}</FieldError>
        </Field>
        <TextAreaField
          control={form.control}
          name="message"
          label="Anything else you'd like us to know"
          optional
          rows={4}
        />
        <CheckboxField control={form.control} name="rightToWork" label="I have the right to work in the UK." />
        <CheckboxField
          control={form.control}
          name="declaration"
          label="The information I've given is correct. I understand this post is subject to an enhanced DBS check, references and safer recruitment checks."
        />
        <HoneypotField register={form.register("website")} />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Sending application" : "Send application"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
