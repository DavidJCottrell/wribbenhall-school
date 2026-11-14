import { ChevronLeftIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { RiverLine } from "@/components/site/river-line"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClosingStatus, WhileOpen } from "@/components/vacancies/closing-status"
import { JobApplicationForm } from "@/components/vacancies/job-application-form"
import { getSchool, getVacancies, getVacancy } from "@/lib/content"
import { formatLong } from "@/lib/dates"
import { describeDocument, documentUrl, isLinkedDocument } from "@/lib/media"

export async function generateStaticParams() {
  const vacancies = await getVacancies()
  return vacancies.map((vacancy) => ({ slug: vacancy.slug }))
}

export async function generateMetadata({ params }: PageProps<"/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const vacancy = await getVacancy(slug)
  return vacancy ? { title: vacancy.title, description: vacancy.summary } : { title: "Vacancy not found" }
}

export default function VacancyPage({ params }: PageProps<"/vacancies/[slug]">) {
  return (
    <Suspense fallback={<VacancySkeleton />}>
      <VacancyDetails params={params} />
    </Suspense>
  )
}

function VacancySkeleton() {
  return (
    <div className="container-page space-y-6 py-14" aria-busy="true">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-14 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-10 h-64 w-full" />
    </div>
  )
}

async function VacancyDetails({ params }: Pick<PageProps<"/vacancies/[slug]">, "params">) {
  const { slug } = await params
  const [vacancy, school] = await Promise.all([getVacancy(slug), getSchool()])
  if (!vacancy) notFound()

  const details = [
    ["Contract", vacancy.contract],
    ["Hours", vacancy.hours],
    ["Salary", vacancy.salary],
    ["Start date", vacancy.startDate],
    ...(vacancy.interviewDate ? [["Interviews", formatLong(vacancy.interviewDate)]] : []),
  ]
  const applicationForm = vacancy.documents.find((doc) => /application form/i.test(doc.title))

  return (
    <article>
      <header className="relative overflow-hidden border-b border-border">
        <div className="container-page pt-10 pb-12 md:pt-14 md:pb-16">
          <Link href="/vacancies" className="inline-flex items-center gap-1 text-severn underline-offset-4 hover:underline">
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            All vacancies
          </Link>
          <h1 className="mt-6 max-w-4xl text-title">{vacancy.title}</h1>
          <p className="mt-5 measure text-lead text-muted-foreground">{vacancy.summary}</p>
        </div>
        <RiverLine draw="load" className="absolute -bottom-3 left-0 h-10 w-full text-stone" quiet />
      </header>

      <div className="container-page grid gap-14 py-12 md:py-16 lg:grid-cols-12">
        <aside className="lg:order-last lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Closing date</dt>
                <dd className="font-semibold">
                  <ClosingStatus closingDate={vacancy.closingDate} />
                  {vacancy.closingTime ? <span className="block font-normal">{vacancy.closingTime}</span> : null}
                </dd>
              </div>
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <WhileOpen closingDate={vacancy.closingDate} closed={null}>
              <div className="mt-6 border-t border-border pt-6">
                <Button asChild className="w-full">
                  <a href="#apply">Apply online</a>
                </Button>
              </div>
            </WhileOpen>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <div className="prose-school text-lg leading-[1.7]">
            <h2 className="mt-0!">About the role</h2>
            {vacancy.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h2>What you&apos;ll do</h2>
            <ul>
              {vacancy.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2>What we&apos;re looking for</h2>
            <ul>
              {vacancy.personSpecification.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2>How to apply</h2>
            {vacancy.howToApply.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {vacancy.documents.length > 0 ? (
            <section aria-labelledby="documents" className="mt-8">
              <h3 id="documents" className="font-sans text-lg font-semibold">
                Vacancy documents
              </h3>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {vacancy.documents.map((doc) => (
                  <li key={doc.title} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-ink">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{describeDocument(doc.file)}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      {isLinkedDocument(doc.file) ? (
                        <a href={documentUrl(doc.file)} target="_blank" rel="noopener">
                          <ExternalLinkIcon />
                          Open
                          <span className="sr-only"> {doc.title} in a new tab</span>
                        </a>
                      ) : (
                        <a href={documentUrl(doc.file)} download>
                          <DownloadIcon />
                          Download
                          <span className="sr-only"> {doc.title}</span>
                        </a>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="safer-recruitment" className="mt-12 rounded-xl border-l-4 border-buttercup bg-card p-6">
            <h2 id="safer-recruitment" className="font-sans text-lg font-semibold">
              Safeguarding statement
            </h2>
            <div className="mt-2 space-y-3 text-ink/85">
              <p>
                {school.name} is committed to safeguarding and promoting the welfare of children and young people, and
                expects all staff to share this commitment.
              </p>
              <p>
                This post involves regulated activity with children and is subject to an enhanced DBS check, including a
                check of the children&apos;s barred list. Appointment is subject to identity, right-to-work and
                qualification checks, two satisfactory references and confirmation of medical fitness. Shortlisted
                candidates will be subject to an online search.
              </p>
              <p>We welcome applications from everyone and will make reasonable adjustments at any stage of the process.</p>
            </div>
          </section>

          <section id="apply" aria-labelledby="apply-heading" className="mt-16 scroll-mt-28">
            <WhileOpen
              closingDate={vacancy.closingDate}
              closed={
                <div className="rounded-xl border border-dashed border-input bg-card p-7">
                  <h2 id="apply-heading" className="text-heading">
                    Applications have closed
                  </h2>
                  <p className="mt-3 text-ink/85">
                    The closing date for this role has passed. If you have a question about it, contact the school on{" "}
                    <a href={`tel:${school.phone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
                      {school.phone}
                    </a>{" "}
                    or{" "}
                    <a href={`mailto:${school.email}`} className="font-semibold underline underline-offset-4">
                      {school.email}
                    </a>
                    .
                  </p>
                </div>
              }
            >
              <div className="rounded-xl border border-border bg-card p-6 md:p-9">
                <h2 id="apply-heading" className="text-heading">
                  Apply for this role
                </h2>
                <p className="mt-2 mb-8 text-muted-foreground">
                  Complete the application form, then upload it here. You can also email it to {school.email}.
                </p>
                <JobApplicationForm
                  vacancySlug={vacancy.slug}
                  vacancyTitle={vacancy.title}
                  applicationFormUrl={applicationForm ? documentUrl(applicationForm.file) : undefined}
                />
              </div>
            </WhileOpen>
          </section>
        </div>
      </div>
    </article>
  )
}
