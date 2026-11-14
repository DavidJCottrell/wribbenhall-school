import Link from "next/link"

import { UpcomingEvents } from "@/components/home/upcoming-events"
import { PartnerLogos } from "@/components/home/partner-logos"
import { MediaImage } from "@/components/site/media-image"
import { RiverLine } from "@/components/site/river-line"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { getEvents, getSchool } from "@/lib/content"

export default async function HomePage() {
  const [school, events] = await Promise.all([getSchool(), getEvents()])
  const phoneHref = `tel:${school.phone.replace(/\s/g, "")}`

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-end gap-10 pt-12 pb-20 md:pt-16 grid-cols-1 lg:grid-cols-12 lg:gap-12 lg:pb-28">
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

          <Link
            href="/about"
            className="mt-8 inline-block font-semibold text-severn underline decoration-2 underline-offset-4 hover:decoration-buttercup"
          >
            More about us and meet our staff
          </Link>
        </div>
      </section>

      <section aria-labelledby="our-school" className="bg-panel panel-edge text-panel-foreground">
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
                <h3 className="text-heading text-panel-accent">{feature.title}</h3>
                <p className="mt-3 text-panel-foreground/90">{feature.text}</p>
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
          <Accordion type="multiple" className="self-start border-t border-border lg:col-span-7">
            <AccordionItem value="main-needs">
              <AccordionTrigger className="py-5 font-display text-subheading font-normal">
                Our pupils&apos; main needs
              </AccordionTrigger>
              <AccordionContent className="text-base">
                <ul className="space-y-2">
                  {school.pupilProfile.mainNeeds.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-severn" />
                      {item}
                    </li>
                  ))}
                </ul>
                <h3 className="mt-6 font-sans text-base font-semibold">These may also include</h3>
                <ul className="mt-3 space-y-2">
                  {school.pupilProfile.mayInclude.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-severn/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="not-provided-for">
              <AccordionTrigger className="py-5 font-display text-subheading font-normal">
                We are not able to provide for
              </AccordionTrigger>
              <AccordionContent className="text-base">
                <ul className="space-y-2">
                  {school.pupilProfile.notProvidedFor.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-0.5 w-2.5 shrink-0 bg-ink/60" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  This list includes, but is not limited to, these profiles.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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

      <PartnerLogos partners={school.partners} />

      <section aria-labelledby="visit" className="container-page pb-24">
        <div className="grid gap-8 rounded-2xl bg-accent px-7 py-12 md:grid-cols-12 md:px-14 md:py-16">
          <div className="md:col-span-7">
            <h2 id="visit" className="text-title text-accent-foreground">
              Talk to us about your child
            </h2>
            <p className="mt-4 max-w-xl text-lg text-accent-foreground/85">
              Every place starts with a conversation. Get in touch and we&apos;ll explain how applications work and
              whether Wribbenhall could be right for your child.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 md:col-span-5 md:items-end">
            <Button asChild size="lg" className="bg-panel text-panel-foreground panel-edge hover:bg-panel/90">
              <Link href="/contact#enquiry">Make an enquiry</Link>
            </Button>
            <p className="text-accent-foreground/85">
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
