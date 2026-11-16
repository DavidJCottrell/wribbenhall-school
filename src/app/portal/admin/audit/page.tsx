import type { Metadata } from "next"
import { z } from "zod"

import { PageHeader } from "@/components/site/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listAuditEvents } from "@/lib/audit"
import { requireUser } from "@/lib/auth/session"
import { listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Audit log" }

const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })

export default async function AuditLogPage({ searchParams }: PageProps<"/portal/admin/audit">) {
  const user = await requireUser({ permission: "audit.view" })
  const { pupil } = await searchParams

  const pupilId = typeof pupil === "string" ? z.uuid().safeParse(pupil) : null
  const [events, pupils] = await Promise.all([
    listAuditEvents(user, { childId: pupilId?.success ? pupilId.data : undefined }),
    listPupilsFor(user, { includeArchived: true }),
  ])
  const nameOf = new Map(pupils.map((entry) => [entry.id, pupilDisplayName(entry)]))

  return (
    <>
      <PageHeader title="Audit log">
        <p>Who viewed or changed records. The most recent {events.length === 200 ? "200" : events.length} entries are shown.</p>
      </PageHeader>

      <div className="container-page space-y-8 py-12 md:py-16">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="pupil" className="mb-1 block text-base font-medium">
              Show one pupil
            </label>
            <select id="pupil" name="pupil" defaultValue={pupilId?.success ? pupilId.data : ""} className="h-11 rounded-md border border-input bg-card px-3 text-base">
              <option value="">Everything</option>
              {pupils.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {pupilDisplayName(entry)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-11 rounded-md bg-primary px-5 font-medium text-primary-foreground">
            Filter
          </button>
        </form>

        {events.length === 0 ? (
          <p className="text-muted-foreground">Nothing has been recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead>Pupil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">{dateTime.format(event.at)}</TableCell>
                    <TableCell>{event.userName}</TableCell>
                    <TableCell>
                      <span className="font-medium capitalize">{event.action}</span>: {event.summary}
                    </TableCell>
                    <TableCell>{event.childId ? (nameOf.get(event.childId) ?? "Deleted pupil") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}
