import Link from "next/link"
import type { ReactNode } from "react"

type Props = {
  title: string
  // Where "see all" goes, if there is more to see.
  href?: string
  hrefLabel?: string
  children: ReactNode
  className?: string
}

export function DashboardCard({ title, href, hrefLabel = "See all", children, className }: Props) {
  const headingId = `card-${title.toLowerCase().replace(/\W+/g, "-")}`
  return (
    <section aria-labelledby={headingId} className={`rounded-xl border border-border bg-card p-6 ${className ?? ""}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-xl font-semibold">
          {title}
        </h2>
        {href ? (
          <Link href={href} className="text-sm underline underline-offset-4">
            {hrefLabel}
            <span className="sr-only"> for {title.toLowerCase()}</span>
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
