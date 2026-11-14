import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/site/page-header"
import { ClosingStatus } from "@/components/vacancies/closing-status"
import { getSchool, getVacancies } from "@/lib/content"

export const metadata: Metadata = {
  title: "Vacancies",
  description: "Current jobs at Wribbenhall School, a special school in Bewdley.",
}

export default async function VacanciesPage() {
  const [vacancies, school] = await Promise.all([getVacancies(), getSchool()])
  const sorted = [...vacancies].sort((a, b) => a.closingDate.localeCompare(b.closingDate))

  return (
    <>
      <PageHeader title="Vacancies">
        <p>
          Join a team that knows every pupil by name. We offer thorough induction, regular training with our therapy
          team and time to plan together.
        </p>
      </PageHeader>

      <div className="container-page grid gap-14 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-input bg-card p-8">
              <h2 className="text-heading">No vacancies at the moment</h2>
              <p className="mt-3 text-ink/85">
                New roles are posted here first. You&apos;re welcome to send your CV to{" "}
                <a href={`mailto:${school.recruitmentEmail}`} className="font-semibold underline underline-offset-4">
                  {school.recruitmentEmail}
                </a>{" "}
                and we&apos;ll keep it on file for six months.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {sorted.map((vacancy) => (
                <li key={vacancy.slug} className="py-8">
                  <h2 className="text-heading">
                    <Link
                      href={`/vacancies/${vacancy.slug}`}
                      className="underline-offset-[6px] hover:text-severn hover:underline hover:decoration-buttercup hover:decoration-2"
                    >
                      {vacancy.title}
                    </Link>
                  </h2>
                  <p className="mt-3 max-w-prose text-ink/85">{vacancy.summary}</p>
                  <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-muted-foreground">Contract and hours</dt>
                      <dd>
                        {vacancy.contract}, {vacancy.hours.charAt(0).toLowerCase() + vacancy.hours.slice(1)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Salary</dt>
                      <dd>{vacancy.salary}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Closing date</dt>
                      <dd>
                        <ClosingStatus closingDate={vacancy.closingDate} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Start date</dt>
                      <dd>{vacancy.startDate}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/vacancies/${vacancy.slug}`}
                    className="mt-5 inline-block font-semibold text-severn underline decoration-2 underline-offset-4 hover:decoration-buttercup"
                  >
                    Read more and apply<span className="sr-only">: {vacancy.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl bg-severn p-7 text-white">
            <h2 className="text-heading">Working here</h2>
            <ul className="mt-5 space-y-3 text-white/90">
              <li>Local Government Pension Scheme or Teachers&apos; Pension</li>
              <li>Paid training in Team Teach, Makaton and medical care</li>
              <li>Free on-site parking and a cycle-to-work scheme</li>
              <li>Employee assistance programme for staff wellbeing</li>
            </ul>
          </div>
          <div className="mt-6 px-1 text-sm text-muted-foreground">
            <p>
              We are committed to safeguarding and promoting the welfare of children. All posts are subject to an
              enhanced DBS check, references and safer recruitment checks.
            </p>
            <p className="mt-3">
              Questions about a role? Email{" "}
              <a href={`mailto:${school.recruitmentEmail}`} className="break-all underline underline-offset-4">
                {school.recruitmentEmail}
              </a>
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
