"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { closeSchoolDay, reopenSchoolDay, saveRegister } from "@/app/actions/attendance"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ATTENDANCE_CODES, SESSION_LABELS, registerChoices, type AttendanceCode } from "@/lib/attendance/codes"
import type { RegisterRow } from "@/lib/portal/attendance"

type Choice = AttendanceCode | ""

type Draft = { pupilId: string; pupilName: string; am: Choice; pm: Choice; note: string }

const selectClass = "h-11 w-full min-w-0 rounded-md md:min-w-40 border border-input bg-card px-2 text-base disabled:cursor-not-allowed disabled:opacity-60"

function CodeSelect({ id, label, value, disabled, onChange }: { id: string; label: string; value: Choice; disabled: boolean; onChange: (value: Choice) => void }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as Choice)} className={selectClass}>
        <option value="">Not recorded</option>
        {registerChoices.map((code) => (
          <option key={code} value={code}>
            {ATTENDANCE_CODES[code].label}
          </option>
        ))}
      </select>
    </>
  )
}

type Props = {
  date: string
  rows: RegisterRow[]
  // Why the register can't be edited, or null if it can.
  readOnlyReason: string | null
  canManage: boolean
  closed: boolean
  // Today or earlier. Closing a day in the future makes no sense.
  canCloseThisDay: boolean
}

export function RegisterForm({ date, rows, readOnlyReason, canManage, closed, canCloseThisDay }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [overwriteMessage, setOverwriteMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    rows.map((row) => ({ pupilId: row.pupilId, pupilName: row.pupilName, am: row.am?.code ?? "", pm: row.pm?.code ?? "", note: row.am?.note ?? row.pm?.note ?? "" })),
  )

  const readOnly = readOnlyReason !== null
  const update = (pupilId: string, changes: Partial<Draft>) => setDrafts((current) => current.map((draft) => (draft.pupilId === pupilId ? { ...draft, ...changes } : draft)))

  function markAllPresent() {
    setDrafts((current) => current.map((draft) => ({ ...draft, am: draft.am === "" ? "present" : draft.am, pm: draft.pm === "" ? "present" : draft.pm })))
  }

  function save() {
    startTransition(async () => {
      const result = await saveRegister({ date, rows: drafts.map(({ pupilId, am, pm, note }) => ({ pupilId, am, pm, note })) })
      if (result.ok) {
        toast.success(result.saved === 0 ? "Nothing to save" : `Register saved (${result.saved} marks)`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  function close(confirmOverwrite: boolean) {
    startTransition(async () => {
      const result = await closeSchoolDay({ date, confirmOverwrite })
      if (result.ok) {
        toast.success("The school is marked as closed for this day")
        setConfirmingClose(false)
        setOverwriteMessage(null)
        router.refresh()
      } else if (result.message.includes("would be replaced")) {
        setOverwriteMessage(result.message)
      } else {
        toast.error(result.message)
        setConfirmingClose(false)
      }
    })
  }

  function reopen() {
    startTransition(async () => {
      const result = await reopenSchoolDay({ date })
      if (result.ok) {
        toast.success("The day is open again")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (closed) {
    return (
      <Alert>
        <AlertTitle>The school was closed on this day</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>No register is needed, and this day is left out of everyone&apos;s attendance figures.</p>
          {canManage ? (
            <Button type="button" variant="outline" onClick={reopen} disabled={pending}>
              {pending ? <Spinner /> : null}
              Reopen this day
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (drafts.length === 0) return <p className="text-muted-foreground">There are no pupils on the register yet.</p>

  return (
    <div className="space-y-6">
      {readOnlyReason ? (
        <Alert>
          <AlertDescription>{readOnlyReason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-card md:overflow-x-auto">
        <table className="block w-full text-left md:table">
          <caption className="sr-only">Register for {date}</caption>
          <thead className="sr-only md:table-header-group md:not-sr-only">
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Pupil
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {SESSION_LABELS.am}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {SESSION_LABELS.pm}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Note for staff
              </th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {drafts.map((draft) => (
              <tr key={draft.pupilId} className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-border p-4 last:border-0 md:table-row md:p-0">
                <th scope="row" className="col-span-2 text-lg font-semibold md:table-cell md:px-4 md:py-3 md:text-base md:whitespace-nowrap">
                  {draft.pupilName}
                </th>
                <td className="min-w-0 md:table-cell md:px-4 md:py-3">
                  <span aria-hidden="true" className="mb-1 block text-sm text-muted-foreground md:hidden">
                    {SESSION_LABELS.am}
                  </span>
                  <CodeSelect id={`am-${draft.pupilId}`} label={`${draft.pupilName}, morning`} value={draft.am} disabled={readOnly || pending} onChange={(value) => update(draft.pupilId, { am: value })} />
                </td>
                <td className="min-w-0 md:table-cell md:px-4 md:py-3">
                  <span aria-hidden="true" className="mb-1 block text-sm text-muted-foreground md:hidden">
                    {SESSION_LABELS.pm}
                  </span>
                  <CodeSelect id={`pm-${draft.pupilId}`} label={`${draft.pupilName}, afternoon`} value={draft.pm} disabled={readOnly || pending} onChange={(value) => update(draft.pupilId, { pm: value })} />
                </td>
                <td className="col-span-2 min-w-0 md:table-cell md:px-4 md:py-3">
                  <label htmlFor={`note-${draft.pupilId}`} className="mb-1 block text-sm text-muted-foreground md:sr-only">
                    Note for staff<span className="sr-only"> about {draft.pupilName}</span>
                  </label>
                  <Input id={`note-${draft.pupilId}`} value={draft.note} disabled={readOnly || pending} maxLength={300} onChange={(event) => update(draft.pupilId, { note: event.target.value })} className="md:min-w-52" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="lg" onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null}
            Save register
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={markAllPresent} disabled={pending}>
            Mark everyone present
          </Button>
          {canManage && canCloseThisDay ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setConfirmingClose(true)} disabled={pending}>
              The school was closed
            </Button>
          ) : null}
        </div>
      )}

      <Dialog
        open={confirmingClose}
        onOpenChange={(open) => {
          setConfirmingClose(open)
          if (!open) setOverwriteMessage(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark the school as closed?</DialogTitle>
            <DialogDescription>
              {overwriteMessage ?? "Everyone is marked as closed for the morning and afternoon, and the day is left out of attendance figures. You can reopen it later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmingClose(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant={overwriteMessage ? "destructive" : "default"} onClick={() => close(overwriteMessage !== null)} disabled={pending}>
              {pending ? <Spinner /> : null}
              {overwriteMessage ? "Replace and close" : "Close the day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
