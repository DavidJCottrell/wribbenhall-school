import { ChevronLeftIcon, DownloadIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { RiverLine } from "@/components/site/river-line"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ClosingStatus, WhileOpen } from "@/components/vacancies/closing-status"
import { JobApplicationForm } from "@/components/vacancies/job-application-form"
import { getVacancies, getVacancy } from "@/lib/content"
import { formatLong } from "@/lib/dates"
import { formatFileSize, mediaUrl } from "@/lib/media"

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
  const vacancy = await getVacancy(slug)
  if (!vacancy) notFound()

  const details = [
    ["Contract", vacancy.contract],
    ["Hours", vacancy.hours],
    ["Salary", vacancy.salary],
    ["Start date", vacancy.startDate],
    ...(vacancy.interviewDate ? [["Interviews", formatLong(vacancy.interviewDate)]] : []),
  ]

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
        <RiverLine className="absolute -bottom-3 left-0 h-10 w-full text-stone" quiet />
      </header>

      <div className="container-page grid gap-14 py-12 md:py-16 lg:grid-cols-12">
        <aside className="lg:order-last lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Closing date</dt>
                <dd className="font-semibold">
                  <ClosingStatus closingDate={vacancy.closingDate} />
                </dd>
              </div>
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <WhileOpen closingDate={vacancy.closingDate} closed={null}>
                <Button asChild>
                  <a href="#apply">Apply online</a>
                </Button>
              </WhileOpen>
              {vacancy.applicationPack ? (
                <Button asChild variant="outline">
                  <a href={mediaUrl(vacancy.applicationPack.key)} download>
                    <DownloadIcon />
                    Application pack (PDF, {formatFileSize(vacancy.applicationPack.sizeBytes)})
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="prose-school text-lg leading-[1.7] lg:col-span-8">
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

          <section id="apply" aria-labelledby="apply-heading" className="mt-16 scroll-mt-28 text-base leading-normal">
            <WhileOpen
              closingDate={vacancy.closingDate}
              closed={
                <div className="rounded-xl border border-dashed border-input bg-card p-7">
                  <h2 id="apply-heading" className="mt-0!">
                    Applications have closed
                  </h2>
                  <p>
                    The closing date for this role has passed. Look at our{" "}
                    <Link href="/vacancies" className="font-semibold text-severn underline underline-offset-4">
                      other vacancies
                    </Link>
                    .
                  </p>
                </div>
              }
            >
              <div className="rounded-xl border border-border bg-card p-6 md:p-9">
                <h2 id="apply-heading" className="mt-0!">
                  Apply for this role
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Prefer to use our paper form? Download the application pack and email it to the school office.
                </p>
                <JobApplicationForm vacancySlug={vacancy.slug} vacancyTitle={vacancy.title} />
              </div>
            </WhileOpen>
          </section>
        </div>
      </div>
    </article>
  )
}
