import { ArrowLeftIcon } from "lucide-react"

import { PendingLink } from "./pending-link"

// A consistent way back up one level, with a big enough target for a thumb.
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <PendingLink href={href} className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 underline-offset-4 transition-colors hover:underline active:bg-secondary print:hidden">
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {children}
    </PendingLink>
  )
}
