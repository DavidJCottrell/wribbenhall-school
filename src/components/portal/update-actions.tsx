"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteChildUpdate } from "@/app/actions/child-updates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { ChildUpdateView } from "@/lib/portal/updates"

import { UpdateForm } from "./update-form"

export function UpdateActions({ childId, update }: { childId: string; update: ChildUpdateView }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteChildUpdate(update.id)
      if (result.ok) {
        toast.success("Update deleted")
        setDeleting(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const fileCount = update.attachments.length

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit<span className="sr-only"> {update.title}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(true)}>
        Delete<span className="sr-only"> {update.title}</span>
      </Button>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit update</DialogTitle>
            <DialogDescription>Changes are shown to parents straight away if the update is visible to them.</DialogDescription>
          </DialogHeader>
          <UpdateForm childId={childId} update={update} idPrefix={`edit-${update.id}-`} onSaved={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this update?</DialogTitle>
            <DialogDescription>
              &ldquo;{update.title}&rdquo;
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
              Delete update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
