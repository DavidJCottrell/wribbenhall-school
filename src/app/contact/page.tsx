import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import type { Metadata } from "next"

import { ContactForms } from "@/components/contact/contact-forms"
import { PageHeader } from "@/components/site/page-header"
import { getSchool } from "@/lib/content"

export const metadata: Metadata = {
  title: "Contact us",
  description: "Phone, email and address for Wribbenhall School, plus our enquiry and application forms.",
}

export default async function ContactPage() {
  const school = await getSchool()
  const phoneHref = `tel:${school.phone.replace(/\s/g, "")}`

  return (
    <>
      <PageHeader title="Contact us">
        <p>
          Call the office, send us a message or start an application for your child. To report an absence, please
          phone before 9:15am.
        </p>
      </PageHeader>

      <div className="container-page grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <aside className="space-y-10 lg:col-span-4">
          <section aria-labelledby="office">
            <h2 id="office" className="text-heading">
              School office
            </h2>
            <ul className="mt-5 space-y-4">
              <li className="flex gap-3">
                <PhoneIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-severn" />
                <a href={phoneHref} className="text-lg font-semibold underline decoration-buttercup decoration-2 underline-offset-4">
                  {school.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <MailIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-severn" />
                <a href={`mailto:${school.email}`} className="break-all underline underline-offset-4">
                  {school.email}
                </a>
              </li>
              <li className="flex gap-3">
                <MapPinIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-severn" />
                <div>
                  <address className="not-italic">
                    {school.address.lines.join(", ")}, {school.address.postcode}
                  </address>
                  <a href={school.address.mapUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-severn underline underline-offset-4">
                    Open in a map
                  </a>
                </div>
              </li>
            </ul>
          </section>

          <section aria-labelledby="hours">
            <h2 id="hours" className="font-sans text-lg font-semibold">
              Office hours
            </h2>
            <dl className="mt-3 divide-y divide-border border-y border-border">
              {school.officeHours.map((row) => (
                <div key={row.days} className="flex justify-between gap-4 py-3">
                  <dt>{row.days}</dt>
                  <dd className="text-right text-muted-foreground">{row.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">Closed during school holidays.</p>
          </section>

          <section aria-labelledby="safeguarding" className="rounded-xl border-l-4 border-buttercup bg-card p-5">
            <h2 id="safeguarding" className="font-sans text-lg font-semibold">
              Worried about a child?
            </h2>
            <p className="mt-2 text-ink/85">
              Call the school and ask for the designated safeguarding lead. Outside school hours, contact your local
              children&apos;s services. If a child is in immediate danger, call 999.
            </p>
          </section>
        </aside>

        <div className="lg:col-span-8">
          <ContactForms officeEmail={school.email} admissionsEmail={school.admissionsEmail} />
        </div>
      </div>
    </>
  )
}
