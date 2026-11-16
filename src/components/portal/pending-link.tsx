"use client"

import Link, { useLinkStatus } from "next/link"
import type { ComponentProps } from "react"

// A thin bar across the top of the screen while the page behind a link loads. Fixed, so it never moves the layout.
export function LinkProgress() {
  const { pending } = useLinkStatus()
  return pending ? <span aria-hidden="true" className="link-progress" /> : null
}

// A normal link that shows the progress bar until its page is ready.
export function PendingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <LinkProgress />
    </Link>
  )
}
