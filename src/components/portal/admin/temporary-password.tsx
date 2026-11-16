"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { TemporaryCredentials } from "@/app/actions/admin"

export function TemporaryPassword({ credentials }: { credentials: TemporaryCredentials }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(credentials.password)
      setCopied(true)
    } catch {
      // Clipboard can be blocked, and the password is still on screen to copy by hand.
    }
  }

  return (
    <Alert>
      <AlertTitle>Give these login details to {credentials.email}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>This password is shown once and can&apos;t be looked up again. Pass it on privately. They will be asked to choose their own password when they first log in.</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-md bg-secondary px-3 py-2 font-mono text-base select-all">{credentials.password}</code>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
