"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { assignStaff, linkGuardian, unassignStaff, unlinkGuardian, type AdminResult } from "@/app/actions/admin"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { SelectField, TextField } from "@/components/forms/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { assignStaffSchema, linkGuardianSchema, type AssignStaffValues, type LinkGuardianValues } from "@/lib/forms/schemas"
import type { PersonOption } from "@/lib/admin/queries"

const toOption = (person: PersonOption) => ({ value: person.id, label: `${person.name} (${person.email})` })

function useRefreshingAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<AdminResult>, onFailure?: (result: Extract<AdminResult, { ok: false }>) => void) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        router.refresh()
      } else {
        onFailure?.(result)
        toast.error(result.message)
      }
    })
  }

  return { run, pending }
}

function LinkedPeople({
  people,
  emptyText,
  onRemove,
  pending,
}: {
  people: (PersonOption & { relationship?: string | null })[]
  emptyText: string
  onRemove: (person: PersonOption) => void
  pending: boolean
}) {
  if (people.length === 0) return <p className="text-muted-foreground">{emptyText}</p>

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {people.map((person) => (
        <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="font-semibold">
              {person.name}
              {person.relationship ? <span className="font-normal text-muted-foreground"> ({person.relationship})</span> : null}
            </p>
            <p className="text-sm text-muted-foreground">{person.email}</p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => onRemove(person)}>
            Remove<span className="sr-only"> {person.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function GuardianManager({
  childId,
  linked,
  available,
}: {
  childId: string
  linked: (PersonOption & { relationship: string | null })[]
  available: PersonOption[]
}) {
  const { run, pending } = useRefreshingAction()
  const form = useForm<LinkGuardianValues>({
    resolver: zodResolver(linkGuardianSchema),
    defaultValues: { userId: "", relationship: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    run(
      async () => {
        const result = await linkGuardian(childId, values)
        if (result.ok) form.reset({ userId: "", relationship: "" })
        return result
      },
      (failure) => applyServerErrors(form.setError, failure.fieldErrors),
    ),
  )

  return (
    <div className="space-y-6">
      <LinkedPeople
        people={linked}
        emptyText="No parents or carers are linked yet."
        pending={pending}
        onRemove={(person) => run(() => unlinkGuardian(childId, person.id))}
      />
      {available.length === 0 ? (
        <p className="text-muted-foreground">Every parent login is already linked, or none exist yet. Create one under Logins.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-7 sm:grid-cols-2">
              <SelectField control={form.control} name="userId" label="Parent or carer" options={available.map(toOption)} />
              <TextField control={form.control} name="relationship" label="Relationship" optional placeholder="For example, Mother" />
            </div>
            <div>
              <Button type="submit" disabled={pending}>
                Link to this pupil
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  )
}

export function StaffManager({ childId, linked, available }: { childId: string; linked: PersonOption[]; available: PersonOption[] }) {
  const { run, pending } = useRefreshingAction()
  const form = useForm<AssignStaffValues>({
    resolver: zodResolver(assignStaffSchema),
    defaultValues: { userId: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    run(
      async () => {
        const result = await assignStaff(childId, values)
        if (result.ok) form.reset({ userId: "" })
        return result
      },
      (failure) => applyServerErrors(form.setError, failure.fieldErrors),
    ),
  )

  return (
    <div className="space-y-6">
      <LinkedPeople
        people={linked}
        emptyText="No staff are assigned yet."
        pending={pending}
        onRemove={(person) => run(() => unassignStaff(childId, person.id))}
      />
      {available.length === 0 ? (
        <p className="text-muted-foreground">Every staff login is already assigned, or none exist yet. Create one under Logins.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <SelectField control={form.control} name="userId" label="Member of staff" options={available.map(toOption)} />
            <div>
              <Button type="submit" disabled={pending}>
                Assign to this pupil
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  )
}
