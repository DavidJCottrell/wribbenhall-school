import type { Metadata } from "next"
import Link from "next/link"

import { PolicyBrowser } from "@/components/policies/policy-browser"
import { PageHeader } from "@/components/site/page-header"
import { getPolicies } from "@/lib/content"

export const metadata: Metadata = {
  title: "Policies and documents",
  description: "School policies, safeguarding documents and inspection reports for Wribbenhall School.",
}

export default async function PoliciesPage() {
  const policies = await getPolicies()

  return (
    <>
      <PageHeader title="Policies and documents">
        <p>
          Our school policies, safeguarding documents and inspection reports. Documents open in Google Drive, where you
          can read, download or print them. If you need a paper copy, please{" "}
          <Link href="/contact" className="font-semibold text-severn underline underline-offset-4">
            ask the school office
          </Link>
          .
        </p>
      </PageHeader>
      <div className="container-page py-12 md:py-16">
        <div className="max-w-4xl">
          <PolicyBrowser policies={policies} />
        </div>
      </div>
    </>
  )
}
