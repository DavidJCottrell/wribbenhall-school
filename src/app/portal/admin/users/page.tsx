import type { Metadata } from "next"

import { CreateUserForm } from "@/components/portal/admin/create-user-form"
import { UserRowActions } from "@/components/portal/admin/user-row-actions"
import { PageHeader } from "@/components/site/page-header"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listUsers } from "@/lib/admin/queries"
import type { UserRole } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Logins" }

const roleLabels: Record<UserRole, string> = {
  parent: "Parent or carer",
  staff: "Staff",
  admin: "Administrator",
}

export default async function AdminUsersPage() {
  const admin = await requireUser(["admin"])
  const users = await listUsers(admin)

  return (
    <>
      <PageHeader title="Logins">
        <p>Logins are created here and handed over in person. There is no public sign-up.</p>
      </PageHeader>

      <div className="container-page space-y-14 py-12 md:py-16">
        <section aria-labelledby="create-login" className="max-w-3xl rounded-xl border border-border bg-card p-6 md:p-9">
          <h2 id="create-login" className="text-heading mb-6">
            Create a login
          </h2>
          <CreateUserForm />
        </section>

        <section aria-labelledby="all-logins">
          <h2 id="all-logins" className="text-heading mb-6">
            All logins
          </h2>
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-semibold">{person.name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell className="space-x-2">
                      <span>{roleLabels[person.role]}</span>
                      {person.banned ? <Badge variant="outline">Disabled</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <UserRowActions userId={person.id} name={person.name} banned={person.banned} isSelf={person.id === admin.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  )
}
