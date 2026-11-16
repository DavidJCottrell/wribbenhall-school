import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { z } from "zod"

import { RegisterForm } from "@/components/portal/register-form"
import { PageHeader } from "@/components/site/page-header"
import { canRecordAttendanceOn, RECENT_DAYS_EDITABLE } from "@/lib/attendance/rules"
import { adjacentWeekday, isWeekday } from "@/lib/attendance/stats"
import { can } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { formatLong, ukToday } from "@/lib/dates"
import { getRegister } from "@/lib/portal/attendance"

export const metadata: Metadata = { title: "Register" }

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default async function RegisterPage({ searchParams }: PageProps<"/portal/register">) {
  const user = await requireUser({ kind: "staff" })
  const { date: requested } = await searchParams

  const today = ukToday()
  const parsed = dateSchema.safeParse(requested)
  const date = parsed.success && !Number.isNaN(Date.parse(parsed.data)) && parsed.data <= today ? parsed.data : today

  const rows = await getRegister(user, date)
  const canManage = can(user, "attendance.manage")
  const closed = rows.length > 0 && rows.every((row) => row.am?.code === "closed" && row.pm?.code === "closed")

  let readOnlyReason: string | null = null
  if (!can(user, "attendance.record")) {
    readOnlyReason = "You can see the register, but you don't have permission to take it. Ask an administrator."
  } else if (!canRecordAttendanceOn(user, date, today)) {
    readOnlyReason = `This date is more than ${RECENT_DAYS_EDITABLE} days ago. Only people who manage attendance can change it.`
  }

  const previous = adjacentWeekday(date, -1)
  const next = adjacentWeekday(date, 1)

  return (
    <>
      <PageHeader title="Register">
        <p>{formatLong(date)}</p>
      </PageHeader>

      <div className="container-page space-y-8 py-10">
        <div className="flex flex-wrap items-end gap-4">
          <nav aria-label="Change day" className="flex items-center gap-2">
            <Link href={`/portal/register?date=${previous}`} className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-card px-3 underline-offset-4 hover:underline">
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
              Previous day
            </Link>
            {next <= today ? (
              <Link href={`/portal/register?date=${next}`} className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-card px-3 underline-offset-4 hover:underline">
                Next day
                <ChevronRightIcon aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
            {date !== today ? (
              <Link href="/portal/register" className="inline-flex h-11 items-center rounded-md px-3 underline underline-offset-4">
                Today
              </Link>
            ) : null}
          </nav>
          <form method="get" className="flex items-end gap-2">
            <div>
              <label htmlFor="register-date" className="mb-1 block text-sm text-muted-foreground">
                Go to a date
              </label>
              <input id="register-date" name="date" type="date" max={today} defaultValue={date} className="h-11 rounded-md border border-input bg-card px-3 text-base" />
            </div>
            <button type="submit" className="h-11 rounded-md border border-border bg-card px-4 font-medium hover:bg-secondary">
              Go
            </button>
          </form>
        </div>

        {!isWeekday(date) ? <p className="text-muted-foreground">This is a weekend. A register is not normally taken.</p> : null}

        {/* Remounted per day, so the form never shows one day's marks under another day's date. */}
        <RegisterForm
          key={date}
          date={date}
          rows={rows}
          readOnlyReason={readOnlyReason}
          canManage={canManage}
          closed={closed}
          canCloseThisDay={date <= today}
        />
      </div>
    </>
  )
}
