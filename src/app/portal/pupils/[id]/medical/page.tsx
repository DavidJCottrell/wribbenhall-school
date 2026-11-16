import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { MedicalPanel } from "@/components/portal/medical/medical-panel"
import { ParentMedical } from "@/components/portal/medical/parent-medical"
import { recordAuditAfterResponse } from "@/lib/audit"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { ukToday } from "@/lib/dates"
import { getMedicalFor, getParentMedicalFor, listWitnessOptions } from "@/lib/portal/medical"
import { getPupilFor, pupilDisplayName } from "@/lib/portal/pupils"

export const metadata: Metadata = { title: "Medical" }

export default async function PupilMedicalPage({ params }: PageProps<"/portal/pupils/[id]/medical">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  const pupil = pupilId.success ? await getPupilFor(user, pupilId.data) : null
  if (!pupil) notFound()

  if (user.kind === "parent") {
    const view = await getParentMedicalFor(user, pupil.id)
    if (!view) notFound()
    return (
      <div className="container-page max-w-3xl py-10">
        <ParentMedical view={view} />
      </div>
    )
  }

  if (!can(user, "medical.view")) notFound()
  const [record, witnesses] = await Promise.all([getMedicalFor(user, pupil.id), listWitnessOptions(user)])
  if (!record) notFound()

  recordAuditAfterResponse(user, { action: "view", subject: "medical", subjectId: pupil.id, childId: pupil.id, summary: "Viewed medical records" })

  return (
    <div className="container-page max-w-4xl py-10">
      <MedicalPanel pupil={{ id: pupil.id, name: pupilDisplayName(pupil) }} record={record} user={user} today={ukToday()} witnesses={witnesses} />
    </div>
  )
}
