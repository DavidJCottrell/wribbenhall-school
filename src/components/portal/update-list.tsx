import { Badge } from "@/components/ui/badge"
import { formatLong } from "@/lib/dates"
import type { ChildUpdateView } from "@/lib/portal/children"

export function UpdateList({ updates, showVisibility }: { updates: ChildUpdateView[]; showVisibility: boolean }) {
  if (updates.length === 0) {
    return <p className="text-muted-foreground">There are no updates yet.</p>
  }

  return (
    <ol className="space-y-4">
      {updates.map((update) => (
        <li key={update.id} className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-lg font-semibold">{update.title}</h3>
            <time dateTime={update.occurredOn} className="text-muted-foreground">
              {formatLong(update.occurredOn)}
            </time>
          </div>
          <p className="mt-3 max-w-prose whitespace-pre-line">{update.body}</p>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Added by {update.authorName}</span>
            {showVisibility && !update.visibleToParents ? <Badge variant="outline">Staff only</Badge> : null}
          </p>
        </li>
      ))}
    </ol>
  )
}
