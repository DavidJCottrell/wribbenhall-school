import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import type { Metadata } from "next"

import { ContactForms } from "@/components/contact/contact-forms"
import { PageHeader } from "@/components/site/page-header"
import { getSchool } from "@/lib/content"

export const metadata: Metadata = {
  title: "Contact us",
  description: "Phone, email and address for Wribbenhall School, plus our enquiry and application forms.",
}

const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`

export default async function ContactPage() {
  const school = await getSchool()

  return (
    <>
      <PageHeader title="Contact us">
        <p>Call or email the school, send us a message, or start an application for your child.</p>
      </PageHeader>

      <div className="container-page grid gap-12 py-12 md:py-16 grid-cols-1 lg:grid-cols-12">
        <aside className="space-y-10 lg:col-span-4">
          <section aria-labelledby="school-office">
            <h2 id="school-office" className="text-heading">
              The school
            </h2>
            <ul className="mt-5 space-y-4">
              <li className="flex gap-3">
                <PhoneIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-severn" />
                <a
                  href={telHref(school.phone)}
                  className="text-lg font-semibold underline decoration-buttercup decoration-2 underline-offset-4"
                >
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
                  <a
                    href={school.address.mapUrl}
                    target="_blank"
                    rel="noopener"
                    className="mt-1 inline-block text-severn underline underline-offset-4"
                  >
                    Open in a map
                  </a>
                </div>
              </li>
            </ul>
          </section>

          <section aria-labelledby="people">
            <h2 id="people" className="font-sans text-lg font-semibold">
              Who to contact
            </h2>
            <dl className="mt-3 divide-y divide-border border-y border-border">
              {school.people.map((person) => (
                <div key={person.role} className="py-4">
                  <dt className="text-sm text-muted-foreground">{person.role}</dt>
                  <dd className="font-semibold text-ink">{person.name}</dd>
                  {person.email ? (
                    <dd>
                      <a href={`mailto:${person.email}`} className="break-all underline underline-offset-4">
                        {person.email}
                      </a>
                    </dd>
                  ) : null}
                  {person.phone ? (
                    <dd>
                      <a href={telHref(person.phone)} className="underline underline-offset-4">
                        {person.phone}
                      </a>
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
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
          <ContactForms officeEmail={school.email} />
        </div>
      </div>
    </>
  )
}
