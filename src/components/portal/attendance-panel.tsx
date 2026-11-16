import Link from "next/link"
import type { ReactNode } from "react"

import { AbsenceReasonsChart } from "@/components/charts/absence-reasons-chart"
import { AttendanceCalendar } from "@/components/charts/attendance-calendar"
import { AttendanceMeter } from "@/components/charts/attendance-meter"
import { ChartPatterns } from "@/components/charts/chart-primitives"
import { WeeklyAttendanceChart } from "@/components/charts/weekly-attendance-chart"
import { Badge } from "@/components/ui/badge"
import { ATTENDANCE_CODES } from "@/lib/attendance/codes"
import { groupByWeek } from "@/lib/attendance/stats"
import { formatMedium } from "@/lib/dates"
import type { AttendanceView } from "@/lib/portal/attendance"

const figure = (percentage: number | null) => (percentage === null ? "No data" : `${percentage}%`)

function StatTile({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function AttendancePanel({ view, audience, canEditRegister }: { view: AttendanceView; audience: "staff" | "parent"; canEditRegister: boolean }) {
  const { year, recent } = view
  const absences = year.authorisedAbsences + year.unauthorisedAbsences

  return (
    <div className="space-y-8">
      <ChartPatterns />

      <section aria-labelledby="attendance-figures" className="space-y-5">
        <h2 id="attendance-figures" className="sr-only">
          Attendance figures
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="This school year"
            value={figure(year.percentage)}
            note={
              <>
                {year.sessions === 0 ? "No registers yet" : `${year.attended} of ${plural(year.sessions, "session", "sessions")}`}
                {audience === "staff" && view.persistentAbsence ? (
                  <>
                    {" "}
                    <Badge variant="outline">Below 90%</Badge>
                  </>
                ) : null}
              </>
            }
          />
          <StatTile label="Last 4 weeks" value={figure(recent.percentage)} note={recent.sessions === 0 ? "No registers" : `${recent.attended} of ${plural(recent.sessions, "session", "sessions")}`} />
          <StatTile label="Late arrivals" value={String(year.late)} note="This school year" />
          <StatTile label="Sessions missed" value={String(absences)} note={`${year.authorisedAbsences} authorised, ${year.unauthorisedAbsences} unauthorised`} />
        </div>
        <div className="max-w-2xl rounded-xl border border-border bg-card p-5">
          <p className="mb-3 font-semibold">Attendance this school year</p>
          <AttendanceMeter percentage={year.percentage} label="Attendance this school year" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <WeeklyAttendanceChart weeks={view.weeks} />
        </section>
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
          <AttendanceCalendar weeks={groupByWeek(view.strip)} />
        </section>
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
          <AbsenceReasonsChart reasons={view.reasons} />
        </section>
      </div>

      {audience === "staff" ? (
        <section aria-labelledby="recent-days" className="rounded-xl border border-border bg-card p-5">
          <h2 id="recent-days" className="mb-4 text-xl font-semibold">
            Recent days
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Morning and afternoon marks with notes</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Day
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Morning
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Afternoon
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Note
                  </th>
                  {canEditRegister ? <th scope="col" className="py-2 font-medium"><span className="sr-only">Edit</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {view.recentDays.map((day) => (
                  <tr key={day.date} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-4 font-medium whitespace-nowrap">
                      {formatMedium(day.date)}
                    </th>
                    <td className="py-2 pr-4">{day.am ? ATTENDANCE_CODES[day.am].label : <span className="text-muted-foreground">No register</span>}</td>
                    <td className="py-2 pr-4">{day.pm ? ATTENDANCE_CODES[day.pm].label : <span className="text-muted-foreground">No register</span>}</td>
                    <td className="py-2 pr-4">{day.note}</td>
                    {canEditRegister ? (
                      <td className="py-2">
                        <Link href={`/portal/register?date=${day.date}`} className="underline underline-offset-4">
                          Open register<span className="sr-only"> for {formatMedium(day.date)}</span>
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
