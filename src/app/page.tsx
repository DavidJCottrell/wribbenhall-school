import Image from "next/image"
import Link from "next/link"

import { UpcomingEvents } from "@/components/home/upcoming-events"
import { MediaImage } from "@/components/site/media-image"
import { RiverLine } from "@/components/site/river-line"
import { Button } from "@/components/ui/button"
import { getEvents, getSchool } from "@/lib/content"
import { mediaUrl } from "@/lib/media"

const familyLinks = [
  {
    href: "/contact#apply",
    title: "Apply for a place",
    description: "Tell us about your child and we'll be in touch to talk it through.",
  },
  {
    href: "/calendar",
    title: "Term dates",
    description: "Holidays, long weekends and teacher training days.",
  },
  {
    href: "/policies",
    title: "Policies and inspection reports",
    description: "School policies, safeguarding, ISI and Ofsted reports.",
  },
  {
    href: "/gallery",
    title: "Life at school",
    description: "Photos of the house, the garden and the Wyre Forest.",
  },
  {
    href: "/vacancies",
    title: "Work with us",
    description: "Current jobs and how to apply.",
  },
  {
    href: "/contact",
    title: "Contact the school",
    description: "Phone, email, address and an enquiry form.",
  },
]

export default async function HomePage() {
  const [school, events] = await Promise.all([getSchool(), getEvents()])
  const phoneHref = `tel:${school.phone.replace(/\s/g, "")}`

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-end gap-10 pt-12 pb-20 md:pt-16 lg:grid-cols-12 lg:gap-12 lg:pb-28">
          <div className="lg:col-span-7 lg:pb-8">
            <h1 className="text-display text-ink">
              <span className="block">Wribbenhall</span>
              <span className="block text-severn">School</span>
            </h1>
            <p className="mt-8 max-w-[36ch] text-lead text-ink/85 md:text-[1.375rem]">{school.shortDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/contact#enquiry">Make an enquiry</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/calendar">See term dates</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            <div className="arch relative aspect-[4/5] bg-secondary">
              <MediaImage
                asset={school.heroImage}
                fill
                priority
                quality={85}
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
        <RiverLine animated className="absolute bottom-4 left-0 h-16 w-full text-buttercup md:h-20" />
      </section>

      <section aria-labelledby="coming-up" className="border-y border-border bg-card">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 id="coming-up" className="text-heading">
              Coming up
            </h2>
            <Link
              href="/calendar"
              className="mt-3 inline-block font-semibold text-severn underline decoration-2 underline-offset-4 hover:decoration-buttercup"
            >
              Full calendar
            </Link>
          </div>
          <div className="lg:col-span-9">
            <UpcomingEvents events={events} />
          </div>
        </div>
      </section>

      <section aria-labelledby="about" className="container-page grid gap-12 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="arch relative mx-auto aspect-[4/5] max-w-[20rem] bg-secondary lg:mx-0">
            <MediaImage asset={school.aboutImage} fill sizes="20rem" className="object-cover" />
          </div>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <h2 id="about" className="text-title">
            About Wribbenhall
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-[1.7] text-ink/90 measure">
            {school.mission.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {school.inspectionQuote ? (
            <figure className="mt-10 border-l-4 border-buttercup pl-6 measure">
              <blockquote className="font-display text-subheading text-ink">
                <p>&ldquo;{school.inspectionQuote.text}&rdquo;</p>
              </blockquote>
              <figcaption className="mt-3 text-muted-foreground">{school.inspectionQuote.source}</figcaption>
            </figure>
          ) : null}

          <h3 className="mt-12 text-heading">{school.sendProvision.heading}</h3>
          <p className="mt-4 text-lg leading-[1.7] text-ink/90 measure">{school.sendProvision.text}</p>
          {school.sendProvision.reportUrl ? (
            <a
              href={school.sendProvision.reportUrl}
              className="mt-4 inline-block font-semibold text-severn underline decoration-2 underline-offset-4 hover:decoration-buttercup"
            >
              Read our SEND information report<span className="sr-only"> (Word document)</span>
            </a>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="our-school" className="bg-severn text-white">
        <div className="container-page py-20 md:py-24">
          <h2 id="our-school" className="max-w-2xl text-title">
            Our school
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            {school.features.map((feature) => (
              <div
                key={feature.title}
                className="border-t-2 border-white/25 pt-6 md:border-t-0 md:border-l-2 md:px-8 md:pt-0 md:first:border-l-0 md:first:pl-0"
              >
                <h3 className="text-heading text-buttercup">{feature.title}</h3>
                <p className="mt-3 text-white/90">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="pupil-profile" className="container-page py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="pupil-profile" className="text-title">
              Who we can help
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-[1.7] text-ink/90">
              {school.pupilProfile.summary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7">
            <div>
              <h3 className="font-sans text-lg font-semibold">Our pupils&apos; main needs</h3>
              <ul className="mt-3 space-y-2">
                {school.pupilProfile.mainNeeds.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-severn" />
                    {item}
                  </li>
                ))}
              </ul>
              <h3 className="mt-8 font-sans text-lg font-semibold">These may also include</h3>
              <ul className="mt-3 space-y-2">
                {school.pupilProfile.mayInclude.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-severn/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-lg font-semibold">We are not able to provide for</h3>
              <ul className="mt-3 space-y-2">
                {school.pupilProfile.notProvidedFor.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 h-0.5 w-2.5 shrink-0 bg-ink/60" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">This list includes, but is not limited to, these profiles.</p>
            </div>
          </div>
        </div>
        <div className="mt-14 rounded-xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-sans text-lg font-semibold">How places are decided</h3>
          <div className="mt-3 grid gap-4 text-ink/85 md:grid-cols-3">
            {school.pupilProfile.decisions.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Recognition and resources" className="border-y border-border bg-card">
        <div className="container-page py-16 md:py-20">
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
        </div>
      </section>

      <section aria-labelledby="staff" className="container-page py-20 md:py-28">
        <h2 id="staff" className="text-title">
          Our staff
        </h2>
        <ul className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-2">
          {school.staff.map((member) => (
            <li key={member.name} className="flex gap-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-secondary ring-4 ring-card">
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
      </section>

      <section aria-labelledby="families" className="container-page pb-20 md:pb-28">
        <h2 id="families" className="text-title">
          Information for families
        </h2>
        <ul className="mt-10 grid border-t border-border md:grid-cols-2 md:gap-x-12">
          {familyLinks.map((link) => (
            <li key={link.title} className="border-b border-border">
              <Link href={link.href} className="group block py-6">
                <span className="text-subheading font-display text-ink group-hover:text-severn group-hover:underline group-hover:decoration-buttercup group-hover:decoration-2 group-hover:underline-offset-[6px]">
                  {link.title}
                </span>
                <span className="mt-1 block text-muted-foreground">{link.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="visit" className="container-page pb-24">
        <div className="grid gap-8 rounded-2xl bg-buttercup px-7 py-12 md:grid-cols-12 md:px-14 md:py-16">
          <div className="md:col-span-7">
            <h2 id="visit" className="text-title text-ink">
              Talk to us about your child
            </h2>
            <p className="mt-4 max-w-xl text-lg text-ink/85">
              Every place starts with a conversation. Get in touch and we&apos;ll explain how applications work and
              whether Wribbenhall could be right for your child.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 md:col-span-5 md:items-end">
            <Button asChild size="lg" className="bg-ink text-white hover:bg-ink/90">
              <Link href="/contact#enquiry">Make an enquiry</Link>
            </Button>
            <p className="text-ink/85">
              Or call{" "}
              <a href={phoneHref} className="font-semibold underline underline-offset-4">
                {school.phone}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
