import type { Metadata } from "next"
import Image from "next/image"

import { MediaImage } from "@/components/site/media-image"
import { PageHeader } from "@/components/site/page-header"
import { Button } from "@/components/ui/button"
import { getSchool } from "@/lib/content"
import { mediaUrl } from "@/lib/media"

export const metadata: Metadata = {
  title: "About us",
  description: "Our staff, recognition and SEND information at Wribbenhall School.",
}

export default async function AboutPage() {
  const school = await getSchool()

  return (
    <>
      <PageHeader title="About us">
        <p>{school.shortDescription}</p>
      </PageHeader>

      <section aria-labelledby="send" className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="send" className="text-title">
              {school.sendProvision.heading}
            </h2>
            <p className="mt-6 text-lg leading-[1.7] text-ink/90 measure">{school.sendProvision.text}</p>
            {school.sendProvision.reportUrl ? (
              <a
                href={school.sendProvision.reportUrl}
                className="mt-4 inline-block font-semibold text-severn underline decoration-2 underline-offset-4 hover:decoration-buttercup"
              >
                Read our SEND information report<span className="sr-only"> (Word document)</span>
              </a>
            ) : null}
          </div>
          {school.inspectionQuote ? (
            <figure className="border-l-4 border-buttercup pl-6 lg:col-span-5">
              <blockquote className="font-display text-subheading text-ink">
                <p>&ldquo;{school.inspectionQuote.text}&rdquo;</p>
              </blockquote>
              <figcaption className="mt-3 text-muted-foreground">{school.inspectionQuote.source}</figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="staff" className="border-y border-border bg-card">
        <div className="container-page py-16 md:py-20">
          <h2 id="staff" className="text-title">
            Our staff
          </h2>
          <ul className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-2">
            {school.staff.map((member) => (
              <li key={member.name} className="flex gap-5">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-secondary ring-4 ring-background">
                  <MediaImage asset={member.portrait} fill sizes="96px" className="object-cover" />
                </div>
                <div>
                  <h3 className="text-subheading">{member.name}</h3>
                  <p className="font-semibold text-severn">{member.role}</p>
                  <p className="mt-3 text-ink/85">{member.bio}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Recognition and resources" className="container-page py-16 md:py-20">
        {school.recognition.map((item) =>
          item.image ? (
            <div key={item.title} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
              <div className="overflow-hidden rounded-xl bg-secondary md:col-span-7">
                <Image
                  src={mediaUrl(item.image.key)}
                  alt={item.image.alt}
                  width={item.image.width}
                  height={item.image.height}
                  sizes="(min-width: 768px) 42rem, 100vw"
                  className="h-auto w-full"
                />
              </div>
              <div className="md:col-span-5">
                <h2 className="text-title">{item.title}</h2>
                <p className="mt-4 max-w-prose text-lg text-ink/85">{item.text}</p>
              </div>
            </div>
          ) : (
            <div
              key={item.title}
              className="mt-12 flex flex-col gap-3 border-t border-border pt-8 md:flex-row md:items-baseline md:justify-between md:gap-10"
            >
              <div>
                <h2 className="text-heading">{item.title}</h2>
                <p className="mt-2 max-w-prose text-lg text-ink/85">{item.text}</p>
              </div>
              {item.link ? (
                <Button asChild variant="outline" className="shrink-0">
                  <a href={item.link.url} target="_blank" rel="noopener">
                    {item.link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
            </div>
          ),
        )}
      </section>
    </>
  )
}
