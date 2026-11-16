import { PaperclipIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ATTENDANCE_CODES, SESSION_LABELS, ATTENDANCE_SESSIONS } from "@/lib/attendance/codes"
import type { CurrentUser } from "@/lib/auth/session"
import { formatLong } from "@/lib/dates"
import { REPORT_SESSIONS } from "@/lib/forms/schemas"
import { canManageDayReport, type DayReportView, type SchoolDay } from "@/lib/portal/day-reports"
import { formatBytes } from "@/lib/uploads"

import { DayReportActions } from "./day-report-actions"

type Props = { days: SchoolDay[]; childId: string; user: CurrentUser }

const sessionLabel = (session: string | null) => REPORT_SESSIONS.find((option) => option.value === session)?.label ?? null

function AttendanceLine({ attendance }: { attendance: NonNullable<SchoolDay["attendance"]> }) {
  const parts = ATTENDANCE_SESSIONS.flatMap((session) => {
    const code = attendance[session]
    return code ? [`${SESSION_LABELS[session]}: ${ATTENDANCE_CODES[code].label}`] : []
  })
  if (parts.length === 0) return null
  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>
}

function ReportCard({ report, childId, user }: { report: DayReportView; childId: string; user: CurrentUser }) {
  const detail = [sessionLabel(report.session), report.subject].filter(Boolean).join(" · ")

  return (
    <li className="rounded-xl border border-border bg-card p-6">
      <h4 className="text-lg font-semibold">{report.title}</h4>
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      <p className="mt-3 max-w-prose whitespace-pre-line">{report.body}</p>
      {report.files.length > 0 ? (
        <ul aria-label="Attachments" className="mt-4 space-y-2">
          {report.files.map((file) => (
            <li key={file.id}>
              <a href={`/portal/files/${file.id}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-severn" />
                {file.filename}
                <span className="text-sm text-muted-foreground no-underline">({formatBytes(file.sizeBytes)})</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Added by {report.authorName ?? "a former member of staff"}</span>
          {user.kind === "staff" && !report.visibleToParents ? <Badge variant="outline">Staff only</Badge> : null}
        </p>
        {canManageDayReport(user, report) ? <DayReportActions childId={childId} report={report} /> : null}
      </div>
    </li>
  )
}

export function DayReportList({ days, childId, user }: Props) {
  if (days.length === 0) {
    return <p className="text-muted-foreground">There are no reports for these days.</p>
  }

  return (
    <ol className="stagger space-y-10">
      {days.map((day) => (
        <li key={day.date}>
          <div className="mb-4 border-b border-border pb-2">
            <h3 className="text-xl font-semibold">
              <time dateTime={day.date}>{formatLong(day.date)}</time>
            </h3>
            {day.attendance ? <AttendanceLine attendance={day.attendance} /> : null}
          </div>
          {day.reports.length > 0 ? (
            <ol className="stagger space-y-4">
              {day.reports.map((report) => (
                <ReportCard key={report.id} report={report} childId={childId} user={user} />
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No report for this day.</p>
          )}
        </li>
      ))}
    </ol>
  )
}
