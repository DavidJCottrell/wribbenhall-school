import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { BackLink } from "@/components/portal/back-link"
import { ContactsManager } from "@/components/portal/admin/contacts-manager"
import { GuardianManager } from "@/components/portal/admin/pupil-links"
import { PupilDangerZone, PupilProfileForm } from "@/components/portal/admin/pupil-settings"
import { PageHeader } from "@/components/site/page-header"
import { getPupilAdminDetail } from "@/lib/admin/queries"
import { requireUser } from "@/lib/auth/session"
import { pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Pupil details" }

export default async function AdminPupilPage({ params }: PageProps<"/portal/admin/pupils/[id]">) {
  const { id } = await params
  const admin = await requireUser({ permission: "pupils.manage" })

  const childId = z.uuid().safeParse(id)
  const detail = childId.success ? await getPupilAdminDetail(admin, childId.data) : null
  if (!detail) notFound()

  const { pupil } = detail

  return (
    <>
      <PageHeader title={pupilDisplayName(pupil)} eyebrow={<BackLink href="/portal/admin/pupils">All pupils</BackLink>}>
        <p>
          {pupil.yearGroup}
          {pupil.archived ? " · Archived" : ""}
        </p>
      </PageHeader>

      <div className="container-page space-y-14 py-12 md:py-16">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Link href={`/portal/pupils/${pupil.id}`} className="underline underline-offset-4">
            Open their dashboard
          </Link>
        </div>

        <section aria-labelledby="pupil-details" className="max-w-4xl">
          <h2 id="pupil-details" className="text-heading mb-6">
            Details
          </h2>
          <PupilProfileForm pupil={pupil} staff={detail.staffOptions} />
        </section>

        <section aria-labelledby="contacts" className="max-w-3xl">
          <h2 id="contacts" className="text-heading mb-2">
            Contacts
          </h2>
          <p className="mb-6 text-muted-foreground">Emergency contacts and people authorised to collect. All staff can see these.</p>
          <ContactsManager childId={pupil.id} contacts={detail.contacts} parents={detail.parentOptions} />
        </section>

        <section aria-labelledby="guardians" className="max-w-3xl">
          <h2 id="guardians" className="text-heading mb-2">
            Parent logins
          </h2>
          <p className="mb-6 text-muted-foreground">
            Parents and carers with a login to the portal. They see this pupil&apos;s dashboard and anything marked as visible to parents.
          </p>
          <GuardianManager childId={pupil.id} linked={detail.guardians} available={detail.availableParents} />
        </section>

        <PupilDangerZone pupil={pupil} reportCount={detail.reportCount} />
      </div>
    </>
  )
}
