"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteDayReport } from "@/app/actions/day-reports"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { DayReportView } from "@/lib/portal/day-reports"

import { DayReportForm } from "./day-report-form"

export function DayReportActions({ childId, report }: { childId: string; report: DayReportView }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteDayReport(report.id)
      if (result.ok) {
        toast.success("Report deleted")
        setDeleting(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const fileCount = report.files.length

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit<span className="sr-only"> {report.title}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(true)}>
        Delete<span className="sr-only"> {report.title}</span>
      </Button>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit report</DialogTitle>
            <DialogDescription>Changes are shown to parents straight away if the report is visible to them.</DialogDescription>
          </DialogHeader>
          <DayReportForm childId={childId} report={report} idPrefix={`edit-${report.id}-`} onSaved={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              &ldquo;{report.title}&rdquo;
              {fileCount > 0 ? ` and its ${fileCount === 1 ? "attachment" : `${fileCount} attachments`}` : ""} will be permanently
              removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(false)} disabled={pending}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? <Spinner /> : null}
              Delete report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
