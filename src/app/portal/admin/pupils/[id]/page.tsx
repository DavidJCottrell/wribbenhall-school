import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { GuardianManager, StaffManager } from "@/components/portal/admin/pupil-links"
import { PageHeader } from "@/components/site/page-header"
import { getPupilAdminDetail } from "@/lib/admin/queries"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Pupil access" }

export default async function AdminPupilPage({ params }: PageProps<"/portal/admin/pupils/[id]">) {
  const { id } = await params
  const admin = await requireUser(["admin"])

  const childId = z.uuid().safeParse(id)
  const detail = childId.success ? await getPupilAdminDetail(admin, childId.data) : null
  if (!detail) notFound()

  const { pupil } = detail

  return (
    <>
      <PageHeader title={`${pupil.firstName} ${pupil.lastName}`}>
        <p>{pupil.yearGroup}</p>
      </PageHeader>

      <div className="container-page space-y-12 py-12 md:py-16">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Link href="/portal/admin/pupils" className="inline-flex items-center gap-2 underline underline-offset-4">
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            All pupils
          </Link>
          <Link href={`/portal/children/${pupil.id}`} className="underline underline-offset-4">
            View their updates
          </Link>
        </div>

        <section aria-labelledby="guardians" className="max-w-3xl">
          <h2 id="guardians" className="text-heading mb-2">
            Parents and carers
          </h2>
          <p className="mb-6 text-muted-foreground">They can see this pupil&apos;s updates that are marked as visible to parents.</p>
          <GuardianManager childId={pupil.id} linked={detail.guardians} available={detail.availableParents} />
        </section>

        <section aria-labelledby="staff" className="max-w-3xl">
          <h2 id="staff" className="text-heading mb-2">
            Staff
          </h2>
          <p className="mb-6 text-muted-foreground">They can see all of this pupil&apos;s updates and add new ones.</p>
          <StaffManager childId={pupil.id} linked={detail.staff} available={detail.availableStaff} />
        </section>
      </div>
    </>
  )
}
