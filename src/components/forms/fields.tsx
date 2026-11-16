"use client"

import type { ComponentProps, ReactNode } from "react"
import { Controller, type Control, type FieldPath, type FieldValues, type UseFormRegisterReturn } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type SelectOption = string | { value: string; label: string }

const optionValue = (option: SelectOption) => (typeof option === "string" ? option : option.value)
const optionLabel = (option: SelectOption) => (typeof option === "string" ? option : option.label)

type BaseProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  optional?: boolean
  id?: string
}

function LabelText({ label, optional }: { label: ReactNode; optional?: boolean }) {
  return (
    <>
      {label}
      {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
    </>
  )
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  id = name,
  ...inputProps
}: BaseProps<T> & Omit<ComponentProps<typeof Input>, "name">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className="text-base">
            <LabelText label={label} optional={optional} />
          </FieldLabel>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <Input id={id} aria-invalid={fieldState.invalid} {...inputProps} {...field} value={field.value ?? ""} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  id = name,
  ...textareaProps
}: BaseProps<T> & Omit<ComponentProps<typeof Textarea>, "name">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className="text-base">
            <LabelText label={label} optional={optional} />
          </FieldLabel>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <Textarea
            id={id}
            aria-invalid={fieldState.invalid}
            className="min-h-32"
            {...textareaProps}
            {...field}
            value={field.value ?? ""}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder = "Choose an option",
  id = name,
}: BaseProps<T> & { options: readonly SelectOption[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className="text-base">
            {label}
          </FieldLabel>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <Select
            name={field.name}
            value={field.value ?? ""}
            onValueChange={(value) => {
              field.onChange(value)
              field.onBlur()
            }}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.invalid} className="w-full" onBlur={field.onBlur} ref={field.ref}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={optionValue(option)} value={optionValue(option)}>
                  {optionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function RadioField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  inline = false,
}: BaseProps<T> & { options: readonly string[]; inline?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-3">
          <FieldLegend className="mb-0 text-base font-medium">
            {label}
          </FieldLegend>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <RadioGroup
            name={field.name}
            value={field.value ?? ""}
            onValueChange={(value) => {
              field.onChange(value)
              field.onBlur()
            }}
            aria-invalid={fieldState.invalid}
            className={inline ? "flex flex-wrap gap-x-6 gap-y-3" : "gap-3"}
          >
            {options.map((option) => {
              const id = `${name}-${option}`.replace(/\W+/g, "-")
              return (
                <Field key={option} orientation="horizontal" data-invalid={fieldState.invalid} className="w-auto">
                  <RadioGroupItem value={option} id={id} className="size-5" />
                  <FieldLabel htmlFor={id} className="text-base font-normal">
                    {option}
                  </FieldLabel>
                </Field>
              )
            })}
          </RadioGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  )
}

export function CheckboxField<T extends FieldValues>({ control, name, label, description, id = name }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-start">
          <Checkbox
            id={id}
            name={field.name}
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => {
              field.onChange(checked === true)
              field.onBlur()
            }}
            onBlur={field.onBlur}
            ref={field.ref}
            aria-invalid={fieldState.invalid}
            className="mt-0.5 size-5"
          />
          <FieldContent>
            <FieldLabel htmlFor={id} className="text-base leading-snug font-normal">
              {label}
            </FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}

export function CheckboxGroupField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
}: BaseProps<T> & { options: readonly string[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected: string[] = field.value ?? []
        return (
          <FieldSet data-invalid={fieldState.invalid} className="gap-3">
            <FieldLegend className="mb-0 text-base font-medium">
              {label}
            </FieldLegend>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((option) => {
                const id = `${name}-${option}`.replace(/\W+/g, "-")
                return (
                  <Field key={option} orientation="horizontal" data-invalid={fieldState.invalid}>
                    <Checkbox
                      id={id}
                      checked={selected.includes(option)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked === true ? [...selected, option] : selected.filter((value) => value !== option),
                        )
                        field.onBlur()
                      }}
                      className="size-5"
                    />
                    <FieldLabel htmlFor={id} className="text-base font-normal">
                      {option}
                    </FieldLabel>
                  </Field>
                )
              })}
            </div>
            <FieldError errors={[fieldState.error]} />
          </FieldSet>
        )
      }}
    />
  )
}

// Visually hidden trap for bots. Real visitors never see or fill it in.
export function HoneypotField({ register }: { register: UseFormRegisterReturn }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  )
}
