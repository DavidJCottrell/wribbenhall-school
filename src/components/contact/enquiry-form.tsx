"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { submitEnquiry } from "@/app/actions/forms"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { HoneypotField, CheckboxField, RadioField, SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { FormSuccess } from "@/components/forms/form-success"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { enquirerRoles, enquirySchema, enquiryTopics, type EnquiryValues } from "@/lib/forms/schemas"

const emptyEnquiry: Partial<EnquiryValues> = {
  name: "",
  email: "",
  phone: "",
  message: "",
  privacyAccepted: false,
  website: "",
}

export function EnquiryForm({ officeEmail }: { officeEmail: string }) {
  const [reference, setReference] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: emptyEnquiry,
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitEnquiry(values)
      if (result.ok) {
        setReference(result.reference)
        form.reset(emptyEnquiry)
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  })

  if (reference) {
    return (
      <FormSuccess
        title="Enquiry sent"
        reference={reference}
        resetLabel="Send another enquiry"
        onReset={() => setReference(null)}
      >
        <p>Someone from the school office will reply within two working days.</p>
        <p>
          If it&apos;s urgent, please call us. You can also email{" "}
          <a href={`mailto:${officeEmail}`} className="font-semibold underline underline-offset-4">
            {officeEmail}
          </a>{" "}
          and quote your reference.
        </p>
      </FormSuccess>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative">
      <FieldGroup>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} name="name" label="Your name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="email" inputMode="email" />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="phone"
            label="Phone number"
            optional
            type="tel"
            autoComplete="tel"
            inputMode="tel"
          />
          <SelectField control={form.control} name="topic" label="What is your enquiry about?" options={enquiryTopics} />
        </div>
        <RadioField control={form.control} name="role" label="Are you a" options={enquirerRoles} inline />
        <TextAreaField
          control={form.control}
          name="message"
          label="Your message"
          description="If you'd like to visit, tell us which days and times suit you best."
          rows={6}
        />
        <CheckboxField
          control={form.control}
          name="privacyAccepted"
          label="I understand the school will use these details to reply to my enquiry, as described in the privacy notice."
        />
        <HoneypotField register={form.register("website")} />
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? "Sending enquiry" : "Send enquiry"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
