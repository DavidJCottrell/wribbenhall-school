import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { PupilTabs, type PupilTab } from "@/components/portal/pupil-tabs"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { ageOn, toIsoDate } from "@/lib/dates"
import { getParentPupilView, getPupilProfile, pupilDisplayName } from "@/lib/portal/pupils"

// Checks who may open this pupil. Each page below checks again, because a layout is not a security boundary.
export default async function PupilLayout({ children, params }: LayoutProps<"/portal/pupils/[id]">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  if (!pupilId.success) notFound()

  const pupil = user.kind === "staff" ? await getPupilProfile(user, pupilId.data) : await getParentPupilView(user, pupilId.data)
  if (!pupil) notFound()

  const base = `/portal/pupils/${pupil.id}`
  const tabs: PupilTab[] = [
    { href: base, label: "Overview" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/reports`, label: "Daily reports" },
    ...(user.kind === "parent"
      ? [{ href: `${base}/incidents`, label: "Incident notices" }]
      : can(user, "incidents.view")
        ? [{ href: `${base}/incidents`, label: "Incidents" }]
        : []),
    { href: `${base}/profile`, label: user.kind === "staff" ? "Profile and contacts" : "About your child" },
  ]

  const age = pupil.dateOfBirth ? ageOn(pupil.dateOfBirth, toIsoDate(new Date())) : null
  const facts = [pupil.yearGroup, age !== null ? `Age ${age}` : null, pupil.keyWorkerName ? `Key worker: ${pupil.keyWorkerName}` : null].filter(Boolean)

  return (
    <>
      <div className="border-b border-border">
        <div className="container-page pt-8 pb-5">
          <Link href="/portal" className="inline-flex items-center gap-2 underline underline-offset-4">
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {user.kind === "parent" ? "All your children" : "All pupils"}
          </Link>
          <h1 className="text-title mt-4 text-ink">{pupilDisplayName(pupil)}</h1>
          <p className="mt-2 text-lead text-muted-foreground">{facts.join(" · ")}</p>
        </div>
        <PupilTabs tabs={tabs} />
      </div>
      {children}
    </>
  )
}
