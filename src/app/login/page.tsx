import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { LoginForm } from "@/components/portal/login-form"
import { PageHeader } from "@/components/site/page-header"
import { safeNextPath } from "@/lib/auth/redirect"
import { getCurrentUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Log in",
  description: "Parent and staff login for Wribbenhall School.",
  robots: { index: false, follow: false },
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PageHeader title="Log in">
        <p>For parents, carers and staff of Wribbenhall School. Your login is set up by the school office.</p>
      </PageHeader>

      <div className="container-page py-12 md:py-16">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 md:p-9">
          <Suspense fallback={<p className="text-muted-foreground">Loading</p>}>
            <LoginPanel searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function LoginPanel({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams
  const destination = safeNextPath(typeof next === "string" ? next : undefined)

  if (await getCurrentUser()) redirect(destination)

  return <LoginForm destination={destination} />
}
