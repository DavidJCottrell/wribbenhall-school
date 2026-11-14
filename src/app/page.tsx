import Link from "next/link"

import { UpcomingEvents } from "@/components/home/upcoming-events"
import { MediaImage } from "@/components/site/media-image"
import { RiverLine } from "@/components/site/river-line"
import { Button } from "@/components/ui/button"
import { getEvents, getSchool } from "@/lib/content"

const familyLinks = [
  {
    href: "/contact#apply",
    title: "Apply for a place",
    description: "Start an application and we'll be in touch about a visit.",
  },
  {
    href: "/calendar",
    title: "Term dates and events",
    description: "Holidays, INSET days, parents' evenings and performances.",
  },
  {
    href: "/policies",
    title: "Policies and documents",
    description: "Safeguarding, SEND information, curriculum and statutory documents.",
  },
  {
    href: "/gallery",
    title: "Life at school",
    description: "Photos from forest school, trips, sports day and arts week.",
  },
  {
    href: "/vacancies",
    title: "Work with us",
    description: "Current jobs for teachers, teaching assistants and support staff.",
  },
  {
    href: "/contact",
    title: "Talk to the office",
    description: "Phone numbers, email and how to reach us about absence or transport.",
  },
]

export default async function HomePage() {
  const [school, events] = await Promise.all([getSchool(), getEvents()])

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-end gap-10 pt-12 pb-20 md:pt-16 lg:grid-cols-12 lg:gap-12 lg:pb-28">
          <div className="lg:col-span-7 lg:pb-8">
            <h1 className="text-display text-ink">
              <span className="block">Wribbenhall</span>
              <span className="block text-severn">School</span>
            </h1>
            <p className="mt-8 max-w-[34ch] text-lead text-ink/85 md:text-[1.375rem]">{school.shortDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/contact#enquiry">Arrange a visit</Link>
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

      <section aria-labelledby="welcome" className="container-page grid gap-12 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="arch relative mx-auto aspect-[4/5] max-w-[18rem] bg-secondary lg:mx-0">
            <MediaImage
              asset={school.headteacher.portrait}
              fill
              sizes="18rem"
              className="object-cover"
            />
          </div>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <h2 id="welcome" className="text-title">
            A welcome from our headteacher
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-[1.7] text-ink/90 measure">
            {school.headteacher.welcome.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-8 font-display text-xl">{school.headteacher.name}</p>
          <p className="text-muted-foreground">{school.headteacher.role}</p>
        </div>
      </section>

      <section aria-labelledby="pathways" className="bg-severn text-white">
        <div className="container-page py-20 md:py-24">
          <div className="max-w-2xl">
            <h2 id="pathways" className="text-title">
              How learning is organised
            </h2>
            <p className="mt-5 text-lead text-white/85">
              Pupils learn in small classes grouped by how they learn best, not only by age. Each class follows one of
              three pathways, and pupils can move between them as they grow.
            </p>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            {school.pathways.map((pathway) => (
              <div key={pathway.name} className="border-t-2 border-white/25 pt-6 md:border-t-0 md:border-l-2 md:px-8 md:pt-0 md:first:border-l-0 md:first:pl-0">
                <h3 className="text-heading text-buttercup">{pathway.name}</h3>
                <p className="mt-3 text-white/90">{pathway.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="families" className="container-page py-20 md:py-28">
        <h2 id="families" className="text-title">
          Information for families
        </h2>
        <ul className="mt-10 grid border-t border-border md:grid-cols-2 md:gap-x-12">
          {familyLinks.map((link) => (
            <li key={link.href + link.title} className="border-b border-border">
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
              Come and see us
            </h2>
            <p className="mt-4 max-w-xl text-lg text-ink/85">
              Most families visit two or three times before deciding. Visits are quiet, unhurried and can be arranged
              outside the busiest parts of the day if that suits your child better.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 md:col-span-5 md:items-end">
            <Button asChild size="lg" className="bg-ink text-white hover:bg-ink/90">
              <Link href="/contact#enquiry">Book a visit</Link>
            </Button>
            <p className="text-ink/85">
              Or call{" "}
              <a href={`tel:${school.phone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
                {school.phone}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
