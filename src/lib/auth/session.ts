import "server-only"

import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"

import { getAuth } from "./auth"
import { isUserRole, type UserRole } from "./roles"

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

// Deduplicated per request. Not cached across requests, because it reads cookies.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session lookups must only run for real requests, never during prerendering or prefetching.
  await connection()
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session) return null

  const { id, name, email, role } = session.user
  if (!isUserRole(role)) return null

  return { id, name, email, role }
})

export async function requireUser(allowedRoles?: readonly UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (allowedRoles && !allowedRoles.includes(user.role)) notFound()
  return user
}
