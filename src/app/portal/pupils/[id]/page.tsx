import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { AttendanceMeter } from "@/components/charts/attendance-meter"
import { DashboardCard, Facts } from "@/components/portal/dashboard-card"
import { recordAuditAfterResponse } from "@/lib/audit"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatMedium, ukToday } from "@/lib/dates"
import { getAttendanceFor, type AttendanceView } from "@/lib/portal/attendance"
import { getParentPupilView, getPupilProfile, listContactsFor, type ContactView } from "@/lib/portal/pupils"
import { listDayReportsFor, type DayReportView } from "@/lib/portal/day-reports"
import { INCIDENT_TYPES } from "@/lib/incidents/types"
import { listIncidentsFor, listSharedIncidentsFor, type IncidentSummary, type SharedIncident } from "@/lib/portal/incidents"

export const metadata: Metadata = { title: "Pupil overview" }

const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`

function AttendanceSummaryCard({ view, href }: { view: AttendanceView | null; href: string }) {
  if (!view) return null
  const { year, recent } = view
  return (
    <DashboardCard title="Attendance" href={href} hrefLabel="See attendance">
      <p className="text-4xl font-semibold">{year.percentage === null ? "No data" : `${year.percentage}%`}</p>
      <p className="mb-4 text-sm text-muted-foreground">{year.sessions === 0 ? "No registers yet this school year" : `This school year, ${year.attended} of ${year.sessions} sessions`}</p>
      <AttendanceMeter percentage={year.percentage} label="Attendance this school year" />
      {recent.percentage !== null ? <p className="mt-2 text-sm">Last 4 weeks: <span className="font-medium">{recent.percentage}%</span></p> : null}
    </DashboardCard>
  )
}

function RecentReports({ reports, base }: { reports: DayReportView[]; base: string }) {
  if (reports.length === 0) return <p className="text-muted-foreground">There are no daily reports yet.</p>

  return (
    <ul className="divide-y divide-border">
      {reports.map((report) => (
        <li key={report.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-medium">{report.title}</p>
          <p className="text-sm text-muted-foreground">{formatMedium(report.reportDate)}</p>
        </li>
      ))}
      <li className="sr-only">
        <Link href={`${base}/reports`}>All daily reports</Link>
      </li>
    </ul>
  )
}

function RecentIncidents({ incidents }: { incidents: IncidentSummary[] }) {
  if (incidents.length === 0) return <p className="text-muted-foreground">No incidents have been recorded.</p>

  return (
    <ul className="divide-y divide-border">
      {incidents.map((incident) => (
        <li key={incident.id} className="py-3 first:pt-0 last:pb-0">
          <Link href={`/portal/incidents/${incident.id}`} className="font-medium underline underline-offset-4">
            {incident.summary}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatMedium(incident.occurredOn)} · {INCIDENT_TYPES[incident.type]}
            {incident.status === "closed" ? "" : ` · ${incident.status === "open" ? "Open" : "Under review"}`}
          </p>
        </li>
      ))}
    </ul>
  )
}

function SharedNotices({ incidents }: { incidents: SharedIncident[] }) {
  return (
    <ul className="divide-y divide-border">
      {incidents.map((incident) => (
        <li key={incident.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-medium">{INCIDENT_TYPES[incident.type]}</p>
          <p className="text-sm text-muted-foreground">{formatMedium(incident.occurredOn)}</p>
        </li>
      ))}
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
    const [reports, contacts, attendance, notices] = await Promise.all([
      listDayReportsFor(user, pupil.id, { limit: 3 }),
      listContactsFor(user, pupil.id),
      getAttendanceFor(user, pupil.id, ukToday()),
      listSharedIncidentsFor(user, pupil.id, { limit: 3 }),
    ])

    return (
      <div className="container-page grid gap-6 py-10 lg:grid-cols-2">
        <AttendanceSummaryCard view={attendance} href={`${base}/attendance`} />
        <DashboardCard title="Recent daily reports" href={`${base}/reports`}>
          <RecentReports reports={reports} base={base} />
        </DashboardCard>
        {notices.length > 0 ? (
          <DashboardCard title="Incident notices" href={`${base}/incidents`}>
            <SharedNotices incidents={notices} />
          </DashboardCard>
        ) : null}
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
  const [reports, contacts, attendance, incidents] = await Promise.all([
    listDayReportsFor(user, pupil.id, { limit: 3 }),
    listContactsFor(user, pupil.id),
    getAttendanceFor(user, pupil.id, ukToday()),
    listIncidentsFor(user, { childId: pupil.id, limit: 3 }),
  ])

  recordAuditAfterResponse(user, {
    action: "view",
    subject: "pupil",
    subjectId: pupil.id,
    childId: pupil.id,
    summary: "Viewed the pupil overview",
  })

  return (
    <div className="container-page grid gap-6 py-10 lg:grid-cols-2">
      <AttendanceSummaryCard view={attendance} href={`${base}/attendance`} />
      <DashboardCard title="Recent daily reports" href={`${base}/reports`}>
        <RecentReports reports={reports} base={base} />
      </DashboardCard>
      {can(user, "incidents.view") ? (
        <DashboardCard title="Recent incidents" href={`${base}/incidents`}>
          <RecentIncidents incidents={incidents} />
        </DashboardCard>
      ) : null}
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
