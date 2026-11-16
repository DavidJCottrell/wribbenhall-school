import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { UpdateForm } from "@/components/portal/update-form"
import { UpdateList } from "@/components/portal/update-list"
import { PageHeader } from "@/components/site/page-header"
import { requireUser } from "@/lib/auth/session"
import { getChildFor, listUpdatesFor } from "@/lib/portal/children"

export const metadata: Metadata = { title: "Pupil" }

export default async function ChildPage({ params }: PageProps<"/portal/children/[id]">) {
  const { id } = await params
  const user = await requireUser()

  const childId = z.uuid().safeParse(id)
  const pupil = childId.success ? await getChildFor(user, childId.data) : null
  if (!pupil) notFound()

  const updates = await listUpdatesFor(user, pupil.id)
  const canAddUpdates = user.role !== "parent"

  return (
    <>
      <PageHeader title={`${pupil.firstName} ${pupil.lastName}`}>
        <p>{pupil.yearGroup}</p>
      </PageHeader>

      <div className="container-page space-y-12 py-12 md:py-16">
        <Link href="/portal" className="inline-flex items-center gap-2 underline underline-offset-4">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {user.role === "parent" ? "All your children" : "All pupils"}
        </Link>

        {canAddUpdates ? (
          <section aria-labelledby="add-update" className="max-w-3xl rounded-xl border border-border bg-card p-6 md:p-9">
            <h2 id="add-update" className="text-heading mb-6">
              Add an update
            </h2>
            <UpdateForm childId={pupil.id} />
          </section>
        ) : null}

        <section aria-labelledby="updates" className="max-w-3xl">
          <h2 id="updates" className="text-heading mb-6">
            Updates
          </h2>
          <UpdateList updates={updates} childId={pupil.id} user={user} />
        </section>
      </div>
    </>
  )
}
