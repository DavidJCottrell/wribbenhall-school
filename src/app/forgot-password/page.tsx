import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/portal/forgot-password-form"
import { PageHeader } from "@/components/site/page-header"

export const metadata: Metadata = {
  title: "Forgot your password",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeader title="Forgot your password">
        <p>Enter the email address your login uses and we&apos;ll email you a link to choose a new password.</p>
      </PageHeader>

      <div className="container-page py-12 md:py-16">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 md:p-9">
          <ForgotPasswordForm />
        </div>
      </div>
    </>
  )
}
