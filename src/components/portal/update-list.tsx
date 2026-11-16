import { PaperclipIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CurrentUser } from "@/lib/auth/session"
import { formatLong } from "@/lib/dates"
import { canManageUpdate, type ChildUpdateView } from "@/lib/portal/updates"
import { formatBytes } from "@/lib/uploads"

import { UpdateActions } from "./update-actions"

type Props = { updates: ChildUpdateView[]; childId: string; user: CurrentUser }

export function UpdateList({ updates, childId, user }: Props) {
  const showVisibility = user.kind === "staff"

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
          {update.attachments.length > 0 ? (
            <ul aria-label="Attachments" className="mt-4 space-y-2">
              {update.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a href={`/portal/files/${attachment.id}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                    <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-severn" />
                    {attachment.filename}
                    <span className="text-sm text-muted-foreground no-underline">({formatBytes(attachment.sizeBytes)})</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Added by {update.authorName ?? "a former member of staff"}</span>
              {showVisibility && !update.visibleToParents ? <Badge variant="outline">Staff only</Badge> : null}
            </p>
            {canManageUpdate(user, update) ? <UpdateActions childId={childId} update={update} /> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
