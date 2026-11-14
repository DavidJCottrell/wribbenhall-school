import type { Metadata } from "next"

import { MediaImage } from "@/components/site/media-image"
import { PageHeader } from "@/components/site/page-header"
import { getSchool } from "@/lib/content"

export const metadata: Metadata = {
  title: "Our staff",
  description: "Meet the team at Wribbenhall School.",
}

export default async function StaffPage() {
  const school = await getSchool()

  return (
    <>
      <PageHeader title="Our staff" />
      <div className="container-page py-12 md:py-16">
        <ul className="grid gap-x-12 gap-y-12 md:grid-cols-2">
          {school.staff.map((member) => (
            <li key={member.name} className="flex gap-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-secondary ring-4 ring-card">
                <MediaImage asset={member.portrait} fill sizes="96px" className="object-cover" />
              </div>
              <div>
                <h2 className="text-subheading">{member.name}</h2>
                <p className="font-semibold text-severn">{member.role}</p>
                <p className="mt-3 text-ink/85">{member.bio}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
