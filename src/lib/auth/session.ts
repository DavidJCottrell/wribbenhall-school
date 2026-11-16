import "server-only"

import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"

import { getAuth } from "./auth"
import { can, canAny, isUserKind, normalizePermissions, type Permission, type UserKind } from "./permissions"

export type CurrentUser = {
  id: string
  name: string
  email: string
  kind: UserKind
  permissions: Permission[]
  mustChangePassword: boolean
}

// Deduplicated per request. Not cached across requests, because it reads cookies.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session lookups must only run for real requests, never during prerendering or prefetching.
  await connection()
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session) return null

  const { id, name, email, role, permissions, mustChangePassword } = session.user
  if (!isUserKind(role)) return null

  // Parents never hold permissions, whatever is stored.
  return { id, name, email, kind: role, permissions: role === "staff" ? normalizePermissions(permissions) : [], mustChangePassword }
}) satisfies () => Promise<CurrentUser | null>

type RequireUserOptions = {
  // Staff, parents, or either.
  kind?: UserKind
  // Needs at least one of these. A single permission or a list.
  permission?: Permission | readonly Permission[]
  allowPendingPasswordChange?: boolean
}

// For pages. Sends people who aren't logged in to the login page, and shows "not found" for anything they may not see.
export async function requireUser({ kind, permission, allowPendingPasswordChange = false }: RequireUserOptions = {}): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.mustChangePassword && !allowPendingPasswordChange) redirect("/portal/account")
  if (kind && user.kind !== kind) notFound()
  if (permission) {
    const required = typeof permission === "string" ? [permission] : permission
    if (!canAny(user, required)) notFound()
  }
  return user
}

// For server actions and route handlers, which answer with a message instead of a page.
export type ActionUser = { ok: true; user: CurrentUser } | { ok: false; message: string }

export async function getActionUser(permission?: Permission | readonly Permission[]): Promise<ActionUser> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Your session has ended. Please log in again." }
  if (user.mustChangePassword) return { ok: false, message: "Please choose your own password first." }
  if (permission) {
    const required = typeof permission === "string" ? [permission] : permission
    if (!canAny(user, required)) return { ok: false, message: "You don't have permission to do that." }
  }
  return { ok: true, user }
}

export { can }
