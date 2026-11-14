"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState, useTransition } from "react"
import { useForm, useWatch, type FieldErrors } from "react-hook-form"
import { toast } from "sonner"

import { submitPlaceApplication } from "@/app/actions/forms"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import {
  CheckboxField,
  CheckboxGroupField,
  HoneypotField,
  RadioField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/fields"
import { FormSuccess } from "@/components/forms/form-success"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { formatMedium } from "@/lib/dates"
import {
  ehcpStatuses,
  needAreas,
  placeApplicationSchema,
  placeApplicationSteps,
  yearGroups,
  type PlaceApplicationValues,
} from "@/lib/forms/schemas"
import { cn } from "@/lib/utils"

const emptyApplication: Partial<PlaceApplicationValues> = {
  childFirstName: "",
  childLastName: "",
  dateOfBirth: "",
  currentSetting: "",
  localAuthority: "",
  needAreas: [],
  needsSummary: "",
  parentName: "",
  relationship: "",
  email: "",
  phone: "",
  addressLine: "",
  postcode: "",
  consentToShare: false,
  declaration: false,
  website: "",
}

const lastStep = placeApplicationSteps.length - 1

export function PlaceApplicationForm({ admissionsEmail }: { admissionsEmail: string }) {
  const [step, setStep] = useState(0)
  const [reference, setReference] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)

  const form = useForm<PlaceApplicationValues>({
    resolver: zodResolver(placeApplicationSchema),
    defaultValues: emptyApplication,
    mode: "onTouched",
    shouldUnregister: false,
  })

  const values = useWatch({ control: form.control })

  function goTo(nextStep: number) {
    setStep(nextStep)
    requestAnimationFrame(() => stepHeadingRef.current?.focus())
  }

  async function next() {
    const valid = await form.trigger([...placeApplicationSteps[step].fields], { shouldFocus: true })
    if (valid) goTo(step + 1)
  }

  const sendApplication = (values: PlaceApplicationValues) => {
    startTransition(async () => {
      const result = await submitPlaceApplication(values)
      if (result.ok) {
        setReference(result.reference)
        form.reset(emptyApplication)
        setStep(0)
      } else {
        applyServerErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  }

  const showFirstInvalidStep = (errors: FieldErrors<PlaceApplicationValues>) => {
    const firstInvalid = placeApplicationSteps.findIndex((s) => s.fields.some((field) => field in errors))
    if (firstInvalid !== -1 && firstInvalid !== step) goTo(firstInvalid)
  }

  if (reference) {
    return (
      <FormSuccess
        title="Application received"
        reference={reference}
        resetLabel="Start a new application"
        onReset={() => setReference(null)}
      >
        <p>
          Our admissions lead will call or email you within five working days to talk things through and arrange a
          visit for you and your child.
        </p>
        <p>
          Questions in the meantime? Email{" "}
          <a href={`mailto:${admissionsEmail}`} className="font-semibold underline underline-offset-4">
            {admissionsEmail}
          </a>
          .
        </p>
      </FormSuccess>
    )
  }

  return (
    <form onSubmit={(event) => form.handleSubmit(sendApplication, showFirstInvalidStep)(event)} noValidate className="relative">
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Application progress">
        {placeApplicationSteps.map((item, index) => (
          <li key={item.title} aria-current={index === step ? "step" : undefined}>
            <span
              className={cn(
                "block h-1.5 rounded-full",
                index < step ? "bg-severn" : index === step ? "bg-buttercup" : "bg-stone",
              )}
            />
            <span className={cn("mt-2 hidden text-sm sm:block", index === step ? "font-semibold text-ink" : "text-muted-foreground")}>
              {index + 1}. {item.title}
            </span>
          </li>
        ))}
      </ol>

      <h3 ref={stepHeadingRef} tabIndex={-1} className="text-subheading outline-none">
        <span className="sr-only">
          Step {step + 1} of {placeApplicationSteps.length}:{" "}
        </span>
        {placeApplicationSteps[step].title}
      </h3>
      <p className="mt-1 mb-7 text-sm text-muted-foreground sm:hidden">
        Step {step + 1} of {placeApplicationSteps.length}
      </p>

      <FieldGroup className="sm:mt-7">
        {step === 0 ? (
          <>
            <div className="grid gap-7 sm:grid-cols-2">
              <TextField control={form.control} name="childFirstName" label="Child's first name" autoComplete="off" />
              <TextField control={form.control} name="childLastName" label="Child's last name" autoComplete="off" />
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              <TextField control={form.control} name="dateOfBirth" label="Date of birth" type="date" />
              <SelectField control={form.control} name="yearGroup" label="Year group now" options={yearGroups} />
            </div>
            <TextField
              control={form.control}
              name="currentSetting"
              label="Current school or nursery"
              description="If your child isn't in a setting at the moment, tell us that here."
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <RadioField
              control={form.control}
              name="ehcpStatus"
              label="Does your child have an education, health and care plan (EHCP)?"
              options={ehcpStatuses}
            />
            <TextField
              control={form.control}
              name="localAuthority"
              label="Local authority"
              description="The council that holds or is assessing your child's EHCP, for example Worcestershire."
            />
            <CheckboxGroupField
              control={form.control}
              name="needAreas"
              label="Main areas of need"
              description="Choose all that apply."
              options={needAreas}
            />
            <TextAreaField
              control={form.control}
              name="needsSummary"
              label="Tell us about your child"
              description="What they enjoy, how they communicate, and anything that helps them feel settled."
              rows={7}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="grid gap-7 sm:grid-cols-2">
              <TextField control={form.control} name="parentName" label="Your full name" autoComplete="name" />
              <TextField
                control={form.control}
                name="relationship"
                label="Relationship to the child"
                placeholder="For example, mum, dad, foster carer"
              />
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              <TextField control={form.control} name="email" label="Email address" type="email" autoComplete="email" />
              <TextField control={form.control} name="phone" label="Phone number" type="tel" autoComplete="tel" />
            </div>
            <div className="grid gap-7 sm:grid-cols-[1fr_12rem]">
              <TextField control={form.control} name="addressLine" label="Address" autoComplete="street-address" />
              <TextField control={form.control} name="postcode" label="Postcode" autoComplete="postal-code" className="uppercase" />
            </div>
            <RadioField
              control={form.control}
              name="preferredContact"
              label="How should we contact you?"
              options={["Email", "Phone"]}
              inline
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <dl className="divide-y divide-border rounded-lg border border-border bg-muted/40">
              {[
                ["Child", `${values.childFirstName} ${values.childLastName}`],
                ["Date of birth", values.dateOfBirth ? formatMedium(values.dateOfBirth) : ""],
                ["Year group", values.yearGroup],
                ["Current setting", values.currentSetting],
                ["EHCP", values.ehcpStatus],
                ["Local authority", values.localAuthority],
                ["Areas of need", values.needAreas?.join(", ")],
                ["Parent or carer", `${values.parentName} (${values.relationship})`],
                ["Contact", `${values.email}, ${values.phone}`],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr]">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-ink">{value || "Not given"}</dd>
                </div>
              ))}
            </dl>
            <CheckboxField
              control={form.control}
              name="consentToShare"
              label="I agree that the school can contact my child's local authority and current setting about this application."
            />
            <CheckboxField
              control={form.control}
              name="declaration"
              label="The information I've given is correct to the best of my knowledge."
            />
          </>
        ) : null}

        <HoneypotField register={form.register("website")} />

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          {step > 0 ? (
            <Button type="button" variant="outline" size="lg" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          ) : null}
          {step < lastStep ? (
            <Button type="button" size="lg" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Sending application" : "Send application"}
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  )
}
