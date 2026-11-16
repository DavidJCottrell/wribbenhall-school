import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { DashboardCard, Facts } from "@/components/portal/dashboard-card"
import { recordAuditAfterResponse } from "@/lib/audit"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatMedium } from "@/lib/dates"
import { getParentPupilView, getPupilProfile, listContactsFor } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Profile" }

const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`
const notRecorded = "Not recorded"
const date = (value: string | null) => (value ? formatMedium(value) : notRecorded)

export default async function PupilProfilePage({ params }: PageProps<"/portal/pupils/[id]/profile">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  if (!pupilId.success) notFound()

  const [staffView, parentView] = await Promise.all([
    user.kind === "staff" ? getPupilProfile(user, pupilId.data) : null,
    user.kind === "parent" ? getParentPupilView(user, pupilId.data) : null,
  ])
  const pupil = staffView ?? parentView
  if (!pupil) notFound()

  const contacts = await listContactsFor(user, pupil.id)

  if (staffView) {
    recordAuditAfterResponse(user, {
      action: "view",
      subject: "pupil",
      subjectId: pupil.id,
      childId: pupil.id,
      summary: "Viewed the profile and contacts",
    })
  }

  return (
    <div className="container-page space-y-6 py-10">
      {staffView && can(user, "pupils.manage") ? (
        <p>
          <Link href={`/portal/admin/pupils/${pupil.id}`} className="underline underline-offset-4">
            Edit this profile and its contacts
          </Link>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title={staffView ? "Profile" : "About your child"}>
          <Facts
            items={
              staffView
                ? [
                    { label: "Name", value: `${staffView.firstName} ${staffView.lastName}` },
                    { label: "Preferred name", value: staffView.preferredName ?? notRecorded },
                    { label: "Year group", value: staffView.yearGroup },
                    { label: "Date of birth", value: date(staffView.dateOfBirth) },
                    { label: "Admission date", value: date(staffView.admissionDate) },
                    { label: "Leaving date", value: date(staffView.leavingDate) },
                    { label: "Key worker", value: staffView.keyWorkerName ?? "Not assigned" },
                    { label: "EHCP status", value: staffView.ehcpStatus ?? notRecorded },
                    { label: "Local authority", value: staffView.localAuthority ?? notRecorded },
                    { label: "Next EHCP review", value: date(staffView.ehcpReviewDue) },
                  ]
                : [
                    { label: "Year group", value: pupil.yearGroup },
                    { label: "Date of birth", value: date(parentView?.dateOfBirth ?? null) },
                    { label: "Key worker", value: parentView?.keyWorkerName ?? "Not yet assigned" },
                    { label: "Next EHCP review", value: date(parentView?.ehcpReviewDue ?? null) },
                  ]
            }
          />
        </DashboardCard>

        <DashboardCard title={staffView ? "Contacts" : "Contact details we hold for you"}>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground">{staffView ? "No contacts have been added yet." : "No contact details are linked to your login yet."}</p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((contact) => (
                <li key={contact.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">
                    {contact.name} <span className="font-normal text-muted-foreground">({contact.relationship})</span>
                  </p>
                  <p className="text-sm">
                    {contact.phone ? (
                      <a href={telHref(contact.phone)} className="underline underline-offset-4">
                        {contact.phone}
                      </a>
                    ) : null}
                    {contact.phone && contact.email ? " · " : null}
                    {contact.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contact.parentalResponsibility ? <Badge variant="outline">Parental responsibility</Badge> : null}
                    {contact.emergencyContact ? <Badge variant="outline">Emergency contact</Badge> : null}
                    {contact.authorisedToCollect ? <Badge variant="outline">Can collect</Badge> : null}
                  </div>
                  {staffView && contact.notes ? <p className="text-sm text-muted-foreground">{contact.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
