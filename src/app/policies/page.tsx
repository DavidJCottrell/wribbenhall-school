import type { Metadata } from "next"
import Link from "next/link"

import { PolicyBrowser } from "@/components/policies/policy-browser"
import { PageHeader } from "@/components/site/page-header"
import { getPolicies } from "@/lib/content"

export const metadata: Metadata = {
  title: "Policies and documents",
  description: "Safeguarding, SEND, curriculum and statutory documents for Wribbenhall School.",
}

export default async function PoliciesPage() {
  const policies = await getPolicies()

  return (
    <>
      <PageHeader title="Policies and documents">
        <p>
          Our policies, plans and statutory information. If you need a paper copy, a larger print version or help
          understanding any of these, <Link href="/contact" className="font-semibold text-severn underline underline-offset-4">ask the school office</Link>{" "}
          and we&apos;ll provide one free of charge.
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
