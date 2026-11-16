export const userRoles = ["parent", "staff", "admin"] as const

export type UserRole = (typeof userRoles)[number]

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (userRoles as readonly string[]).includes(value)
}
