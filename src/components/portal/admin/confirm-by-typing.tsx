"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  // What the person has to type before the delete button works.
  phrase: string
  phraseLabel: string
  confirmLabel: string
  pending: boolean
  onConfirm: (typed: string) => void
}

export function ConfirmByTyping({ open, onOpenChange, title, description, phrase, phraseLabel, confirmLabel, pending, onConfirm }: Props) {
  const [typed, setTyped] = useState("")
  const matches = typed.trim().replace(/\s+/g, " ").toLowerCase() === phrase.toLowerCase()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("")
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-phrase" className="text-base">
            {phraseLabel}: <span className="font-semibold">{phrase}</span>
          </Label>
          <Input id="confirm-phrase" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!matches || pending} onClick={() => onConfirm(typed)}>
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
