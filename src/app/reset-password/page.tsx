import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ResetPasswordForm } from "@/components/portal/reset-password-form"
import { PageHeader } from "@/components/site/page-header"

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The link carries a one-time token, so it must not travel in a Referer header.
  referrer: "no-referrer",
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <PageHeader title="Choose a new password" />

      <div className="container-page py-12 md:py-16">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 md:p-9">
          <Suspense fallback={<p className="text-muted-foreground">Loading</p>}>
            <ResetPanel searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function ResetPanel({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { token } = await searchParams

  if (typeof token !== "string" || token.length === 0) {
    return (
      <p>
        This link isn&apos;t complete.{" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Ask for a new one
        </Link>
        .
      </p>
    )
  }

  return <ResetPasswordForm token={token} />
}
