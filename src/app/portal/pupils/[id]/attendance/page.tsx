import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { AttendancePanel } from "@/components/portal/attendance-panel"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { ukToday } from "@/lib/dates"
import { getAttendanceFor } from "@/lib/portal/attendance"

export const metadata: Metadata = { title: "Attendance" }

export default async function PupilAttendancePage({ params }: PageProps<"/portal/pupils/[id]/attendance">) {
  const { id } = await params
  const user = await requireUser()

  const pupilId = z.uuid().safeParse(id)
  const view = pupilId.success ? await getAttendanceFor(user, pupilId.data, ukToday()) : null
  if (!view) notFound()

  return (
    <div className="container-page py-10">
      <AttendancePanel view={view} audience={user.kind} canEditRegister={can(user, "attendance.record")} />
    </div>
  )
}
