import type { Metadata } from "next"

import { CalendarView } from "@/components/calendar/calendar-view"
import { DownloadAllButton } from "@/components/calendar/download-all-button"
import { PageHeader } from "@/components/site/page-header"
import { getAcademicYears, getEvents } from "@/lib/content"
import { formatMedium, formatShort } from "@/lib/dates"

export const metadata: Metadata = {
  title: "Calendar and term dates",
  description: "Term dates, INSET days and events at Wribbenhall School.",
}

export default async function CalendarPage() {
  const [events, academicYears] = await Promise.all([getEvents(), getAcademicYears()])
  const currentYear = academicYears[0]

  return (
    <>
      <PageHeader title="Calendar">
        <p>
          Term dates, closures and events for families. Use <strong className="font-semibold text-ink">Add to calendar</strong>{" "}
          on any event to save it to your phone.
        </p>
      </PageHeader>

      <div className="container-page grid gap-14 py-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <CalendarView events={events} />
        </div>

        <aside aria-labelledby="term-dates" className="lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
            <h2 id="term-dates" className="text-heading">
              Term dates
            </h2>
            {currentYear ? (
              <>
                <p className="mt-1 text-muted-foreground">{currentYear.label}</p>
                <dl className="mt-6 space-y-6">
                  {currentYear.terms.map((term) => (
                    <div key={term.name}>
                      <dt className="font-semibold text-ink">{term.name}</dt>
                      <dd className="mt-1 text-ink/85">
                        {formatMedium(term.start)} to {formatMedium(term.end)}
                      </dd>
                      {term.halfTerm ? (
                        <dd className="text-muted-foreground">
                          Half term: {formatShort(term.halfTerm.start)} to {formatShort(term.halfTerm.end)}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                  <div>
                    <dt className="font-semibold text-ink">INSET days</dt>
                    <dd className="mt-1 text-muted-foreground">School is closed to pupils on these days.</dd>
                    <dd>
                      <ul className="mt-2 space-y-1 text-ink/85">
                        {currentYear.insetDays.map((day) => (
                          <li key={day}>{formatMedium(day)}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-3 text-muted-foreground">Term dates for next year will be published here.</p>
            )}
            <div className="mt-8 border-t border-border pt-6">
              <DownloadAllButton events={events} />
              <p className="mt-3 text-sm text-muted-foreground">
                Opens in Apple Calendar, Google Calendar or Outlook.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
