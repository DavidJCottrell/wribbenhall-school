import type { Metadata } from "next"
import Link from "next/link"
import { z } from "zod"

import { IncidentForm } from "@/components/portal/incidents/incident-form"
import { BackLink } from "@/components/portal/back-link"
import { PageHeader } from "@/components/site/page-header"
import { requireUser } from "@/lib/auth/session"
import { getPupilFor, listPupilsFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Record an incident" }

export default async function NewIncidentPage({ searchParams }: PageProps<"/portal/incidents/new">) {
  const user = await requireUser({ kind: "staff", permission: "incidents.record" })
  const { pupil: requested } = await searchParams

  const pupilId = z.uuid().safeParse(Array.isArray(requested) ? requested[0] : requested)
  const chosen = pupilId.success ? await getPupilFor(user, pupilId.data) : null

  if (!chosen) {
    const pupils = await listPupilsFor(user)
    return (
      <>
        <PageHeader title="Record an incident" eyebrow={<BackLink href="/portal/incidents">All incidents</BackLink>} />
        <div className="container-page max-w-3xl py-12">
          <h2 className="text-heading mb-6">Who is it about?</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {pupils.map((entry) => (
              <li key={entry.id}>
                <Link href={`/portal/incidents/new?pupil=${entry.id}`} className="block p-4 underline-offset-4 hover:underline">
                  {pupilDisplayName(entry)} <span className="text-muted-foreground">({entry.yearGroup})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </>
    )
  }

  const others = (await listPupilsFor(user)).filter((entry) => entry.id !== chosen.id)

  return (
    <>
      <PageHeader title="Record an incident" eyebrow={<BackLink href={`/portal/pupils/${chosen.id}/incidents`}>{`${pupilDisplayName(chosen)}'s incidents`}</BackLink>}>About {pupilDisplayName(chosen)}</PageHeader>
      <div className="container-page max-w-3xl py-12">
        <IncidentForm pupil={{ id: chosen.id, name: pupilDisplayName(chosen) }} otherPupils={others.map((entry) => ({ id: entry.id, name: pupilDisplayName(entry) }))} />
      </div>
    </>
  )
}
