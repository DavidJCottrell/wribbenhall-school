"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteIncident } from "@/app/actions/incidents"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

export function DeleteIncidentButton({ incidentId, summary, fileCount, backHref }: { incidentId: string; summary: string; fileCount: number; backHref: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteIncident(incidentId)
      if (result.ok) {
        toast.success("Incident deleted")
        router.push(backHref)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Delete<span className="sr-only"> this incident</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this incident?</DialogTitle>
            <DialogDescription>
              &ldquo;{summary}&rdquo;{fileCount > 0 ? ` and its ${fileCount === 1 ? "attachment" : `${fileCount} attachments`}` : ""} will be permanently removed. This can&apos;t be
              undone. If it was only recorded wrongly, edit it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? <Spinner /> : null}
              Delete incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
