import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { DashboardCard, Facts } from "@/components/portal/dashboard-card"
import { recordAuditAfterResponse } from "@/lib/audit"
import { requireUser } from "@/lib/auth/session"
import { formatMedium } from "@/lib/dates"
import { getParentPupilView, getPupilProfile, listContactsFor, type ContactView } from "@/lib/portal/pupils"
import { listUpdatesFor, type ChildUpdateView } from "@/lib/portal/updates"

export const metadata: Metadata = { title: "Pupil overview" }

const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`

function RecentReports({ reports, base }: { reports: ChildUpdateView[]; base: string }) {
  if (reports.length === 0) return <p className="text-muted-foreground">There are no daily reports yet.</p>

  return (
    <ul className="divide-y divide-border">
      {reports.map((report) => (
        <li key={report.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-medium">{report.title}</p>
          <p className="text-sm text-muted-foreground">{formatMedium(report.occurredOn)}</p>
        </li>
      ))}
      <li className="sr-only">
        <Link href={`${base}/reports`}>All daily reports</Link>
      </li>
    </ul>
  )
}

function ContactList({ contacts, empty }: { contacts: ContactView[]; empty: string }) {
  if (contacts.length === 0) return <p className="text-muted-foreground">{empty}</p>

  return (
    <ul className="divide-y divide-border">
      {contacts.map((contact) => (
        <li key={contact.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-medium">
            {contact.name} <span className="font-normal text-muted-foreground">({contact.relationship})</span>
          </p>
          {contact.phone ? (
            <a href={telHref(contact.phone)} className="underline underline-offset-4">
              {contact.phone}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">No phone number</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default async function PupilOverviewPage({ params }: PageProps<"/portal/pupils/[id]">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  if (!pupilId.success) notFound()
  const base = `/portal/pupils/${pupilId.data}`

  if (user.kind === "parent") {
    const pupil = await getParentPupilView(user, pupilId.data)
    if (!pupil) notFound()
    const [reports, contacts] = await Promise.all([listUpdatesFor(user, pupil.id, { limit: 3 }), listContactsFor(user, pupil.id)])

    return (
      <div className="container-page grid gap-6 py-10 lg:grid-cols-2">
        <DashboardCard title="Recent daily reports" href={`${base}/reports`}>
          <RecentReports reports={reports} base={base} />
        </DashboardCard>
        <DashboardCard title="About your child" href={`${base}/profile`} hrefLabel="See more">
          <Facts
            items={[
              { label: "Year group", value: pupil.yearGroup },
              { label: "Key worker", value: pupil.keyWorkerName ?? "Not yet assigned" },
              { label: "Next EHCP review", value: pupil.ehcpReviewDue ? formatMedium(pupil.ehcpReviewDue) : "Not recorded" },
            ]}
          />
        </DashboardCard>
        <DashboardCard title="Contact details we hold for you">
          <ContactList contacts={contacts} empty="No contact details are linked to your login yet." />
        </DashboardCard>
      </div>
    )
  }

  const pupil = await getPupilProfile(user, pupilId.data)
  if (!pupil) notFound()
  const [reports, contacts] = await Promise.all([listUpdatesFor(user, pupil.id, { limit: 3 }), listContactsFor(user, pupil.id)])

  recordAuditAfterResponse(user, {
    action: "view",
    subject: "pupil",
    subjectId: pupil.id,
    childId: pupil.id,
    summary: "Viewed the pupil overview",
  })

  return (
    <div className="container-page grid gap-6 py-10 lg:grid-cols-2">
      <DashboardCard title="Recent daily reports" href={`${base}/reports`}>
        <RecentReports reports={reports} base={base} />
      </DashboardCard>
      <DashboardCard title="Key details" href={`${base}/profile`} hrefLabel="Full profile">
        <Facts
          items={[
            { label: "Date of birth", value: pupil.dateOfBirth ? formatMedium(pupil.dateOfBirth) : "Not recorded" },
            { label: "Admission date", value: pupil.admissionDate ? formatMedium(pupil.admissionDate) : "Not recorded" },
            { label: "EHCP status", value: pupil.ehcpStatus ?? "Not recorded" },
            { label: "Next EHCP review", value: pupil.ehcpReviewDue ? formatMedium(pupil.ehcpReviewDue) : "Not recorded" },
          ]}
        />
      </DashboardCard>
      <DashboardCard title="Emergency contacts" href={`${base}/profile`} hrefLabel="All contacts">
        <ContactList contacts={contacts.filter((contact) => contact.emergencyContact)} empty="No emergency contacts have been added yet." />
      </DashboardCard>
    </div>
  )
}
