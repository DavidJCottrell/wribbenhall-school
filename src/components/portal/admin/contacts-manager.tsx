"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { deleteContact, saveContact } from "@/app/actions/pupils"
import { applyServerErrors } from "@/components/forms/apply-server-errors"
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import type { PersonOption } from "@/lib/admin/queries"
import { contactSchema, type ContactValues } from "@/lib/forms/schemas"
import type { ContactView } from "@/lib/portal/pupils"

import { ConfirmByTyping } from "./confirm-by-typing"

const NONE = "none"

function ContactForm({
  childId,
  contact,
  parents,
  onSaved,
}: {
  childId: string
  contact?: ContactView & { linkedUserId?: string | null }
  parents: PersonOption[]
  onSaved: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const prefix = `contact-${contact?.id ?? "new"}-`
  const parentOptions = [{ value: NONE, label: "Not linked to a login" }, ...parents.map((parent) => ({ value: parent.id, label: `${parent.name} (${parent.email})` }))]

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? "",
      relationship: contact?.relationship ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      parentalResponsibility: contact?.parentalResponsibility ?? false,
      emergencyContact: contact?.emergencyContact ?? false,
      authorisedToCollect: contact?.authorisedToCollect ?? false,
      notes: contact?.notes ?? "",
      linkedUserId: contact?.linkedUserId ?? NONE,
    },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveContact(childId, contact?.id ?? null, { ...values, linkedUserId: values.linkedUserId === NONE ? "" : values.linkedUserId })
      if (result.ok) {
        toast.success(contact ? "Contact saved" : "Contact added")
        router.refresh()
        onSaved()
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
          <TextField control={form.control} id={`${prefix}name`} name="name" label="Name" autoComplete="off" />
          <TextField control={form.control} id={`${prefix}relationship`} name="relationship" label="Relationship to the pupil" autoComplete="off" />
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField control={form.control} id={`${prefix}phone`} name="phone" label="Phone" type="tel" optional autoComplete="off" />
          <TextField control={form.control} id={`${prefix}email`} name="email" label="Email" type="email" optional autoComplete="off" />
        </div>
        <CheckboxField control={form.control} id={`${prefix}responsibility`} name="parentalResponsibility" label="Has parental responsibility" />
        <CheckboxField control={form.control} id={`${prefix}emergency`} name="emergencyContact" label="Emergency contact" />
        <CheckboxField control={form.control} id={`${prefix}collect`} name="authorisedToCollect" label="Authorised to collect the pupil" />
        <SelectField
          control={form.control}
          id={`${prefix}linked`}
          name="linkedUserId"
          label="Same person as this parent login"
          description="Linking lets this parent see their own entry on the pupil's page."
          options={parentOptions}
        />
        <TextAreaField control={form.control} id={`${prefix}notes`} name="notes" label="Notes for staff" optional rows={3} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {contact ? "Save contact" : "Add contact"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ContactsManager({ childId, contacts, parents }: { childId: string; contacts: (ContactView & { linkedUserId?: string | null })[]; parents: PersonOption[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ContactView | null>(null)
  const [removing, setRemoving] = useState<ContactView | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmRemove() {
    if (!removing) return
    startTransition(async () => {
      const result = await deleteContact(childId, removing.id)
      if (result.ok) {
        toast.success("Contact removed")
        setRemoving(null)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {contacts.length === 0 ? (
        <p className="text-muted-foreground">No contacts have been added yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="space-y-1">
                <p className="font-semibold">
                  {contact.name} <span className="font-normal text-muted-foreground">({contact.relationship})</span>
                </p>
                <p className="text-sm text-muted-foreground">{[contact.phone, contact.email].filter(Boolean).join(" · ") || "No phone or email"}</p>
                <div className="flex flex-wrap gap-2">
                  {contact.parentalResponsibility ? <Badge variant="outline">Parental responsibility</Badge> : null}
                  {contact.emergencyContact ? <Badge variant="outline">Emergency contact</Badge> : null}
                  {contact.authorisedToCollect ? <Badge variant="outline">Can collect</Badge> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(contact)}>
                  Edit<span className="sr-only"> {contact.name}</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setRemoving(contact)}>
                  Remove<span className="sr-only"> {contact.name}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" onClick={() => setAdding(true)}>
        Add a contact
      </Button>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a contact</DialogTitle>
            <DialogDescription>Someone the school may need to contact about this pupil.</DialogDescription>
          </DialogHeader>
          <ContactForm childId={childId} parents={parents} onSaved={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
            <DialogDescription>Changes are saved straight away.</DialogDescription>
          </DialogHeader>
          {editing ? <ContactForm childId={childId} contact={editing} parents={parents} onSaved={() => setEditing(null)} /> : null}
        </DialogContent>
      </Dialog>

      <ConfirmByTyping
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this contact"}?`}
        description="They will no longer appear on this pupil's record."
        phrase={removing?.name ?? ""}
        phraseLabel="Type their name to confirm"
        confirmLabel="Remove contact"
        pending={pending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
