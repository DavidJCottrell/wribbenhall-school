import type { Metadata } from "next"

import { ChangePasswordForm } from "@/components/portal/change-password-form"
import { PageHeader } from "@/components/site/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const user = await requireUser(undefined, { allowPendingPasswordChange: true })

  return (
    <>
      <PageHeader title="Your account">
        <p>
          {user.name}, {user.email}
        </p>
      </PageHeader>

      <div className="container-page space-y-8 py-12 md:py-16">
        {user.mustChangePassword ? (
          <Alert className="max-w-3xl">
            <AlertTitle>Choose your own password</AlertTitle>
            <AlertDescription>
              You are using a temporary password from the school. Please choose your own before you carry on.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="change-password" className="max-w-xl rounded-xl border border-border bg-card p-6 md:p-9">
          <h2 id="change-password" className="text-heading mb-6">
            Change your password
          </h2>
          <ChangePasswordForm redirectAfter={user.mustChangePassword} />
          <p className="mt-6 text-sm text-muted-foreground">Changing it logs you out of any other devices.</p>
        </section>
      </div>
    </>
  )
}
