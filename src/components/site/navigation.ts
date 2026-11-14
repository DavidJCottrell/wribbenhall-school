export const mainNavigation = [
  { href: "/", label: "Home" },
  { href: "/staff", label: "Staff" },
  { href: "/calendar", label: "Calendar" },
  { href: "/gallery", label: "Gallery" },
  { href: "/policies", label: "Policies" },
  { href: "/vacancies", label: "Vacancies" },
  { href: "/contact", label: "Contact" },
] as const

export type NavHref = (typeof mainNavigation)[number]["href"]

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}
