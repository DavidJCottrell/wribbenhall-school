import type { ReactNode } from "react"

import { RiverLine } from "./river-line"

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div className="container-page pt-14 pb-12 md:pt-20 md:pb-16">
        <h1 className="text-title text-ink">{title}</h1>
        {children ? <div className="mt-5 measure text-lead text-muted-foreground">{children}</div> : null}
      </div>
      <RiverLine className="absolute -bottom-3 left-0 h-10 w-full text-stone" quiet />
    </div>
  )
}
