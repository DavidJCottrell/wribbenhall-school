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
import { CV_TYPES, MAX_CV_BYTES, jobApplicationSchema, type JobApplicationValues } from "@/lib/forms/schemas"

export function JobApplicationForm({ vacancySlug, vacancyTitle }: { vacancySlug: string; vacancyTitle: string }) {
  const emptyValues: JobApplicationValues = {
    vacancySlug,
    fullName: "",
    email: "",
    phone: "",
    currentRole: "",
    supportingStatement: "",
    rightToWork: false,
    declaration: false,
    website: "",
  }

  const [reference, setReference] = useState<string | null>(null)
  const [cvError, setCvError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const cvInput = useRef<HTMLInputElement>(null)

  const form = useForm<JobApplicationValues>({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: emptyValues,
    mode: "onTouched",
  })

  function checkCv() {
    const file = cvInput.current?.files?.[0]
    if (!file) return true
    if (!CV_TYPES.includes(file.type) || file.size > MAX_CV_BYTES) {
      setCvError("Upload a PDF or Word document under 5 MB")
      return false
    }
    setCvError(null)
    return true
  }

  const submitValues = (values: JobApplicationValues) => {
    if (!checkCv()) return

    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) formData.append(key, String(value ?? ""))
    const cv = cvInput.current?.files?.[0]
    if (cv) formData.append("cv", cv)

    startTransition(async () => {
      const result = await submitJobApplication(formData)
      if (result.ok) {
        setReference(result.reference)
        form.reset(emptyValues)
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        if (result.fieldErrors?.cv?.[0]) setCvError(result.fieldErrors.cv[0])
        toast.error(result.message)
      }
    })
  }

  if (reference) {
    return (
      <FormSuccess title="Application sent" reference={reference} resetLabel="Back to the form" onReset={() => setReference(null)}>
        <p>Thank you for applying for the {vacancyTitle} role. We&apos;ll let all applicants know the outcome of shortlisting after the closing date.</p>
      </FormSuccess>
    )
  }

  return (
    <form onSubmit={(event) => form.handleSubmit(submitValues)(event)} noValidate className="relative">
      <FieldGroup>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="fullName" label="Full name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="email" />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="phone" label="Phone number" type="tel" autoComplete="tel" />
          <TextField control={form.control} name="currentRole" label="Current job title" optional />
        </div>
        <TextAreaField
          control={form.control}
          name="supportingStatement"
          label="Supporting statement"
          description="Tell us why you'd like this role and how your experience matches the person specification."
          rows={9}
        />
        <Field data-invalid={Boolean(cvError)}>
          <FieldLabel htmlFor="cv" className="text-base">
            CV <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <FieldDescription>PDF or Word document, up to 5 MB.</FieldDescription>
          <Input
            ref={cvInput}
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={checkCv}
            aria-invalid={Boolean(cvError)}
            className="h-auto py-2 file:mr-3 file:h-8 file:rounded-md file:bg-secondary file:px-3"
          />
          <FieldError>{cvError}</FieldError>
        </Field>
        <CheckboxField control={form.control} name="rightToWork" label="I have the right to work in the UK." />
        <CheckboxField
          control={form.control}
          name="declaration"
          label="The information I've given is correct. I understand this post is subject to an enhanced DBS check and references."
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
