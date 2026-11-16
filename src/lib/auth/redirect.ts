const DEFAULT_DESTINATION = "/portal"

// Only follow paths on this site, so a crafted link can't send people elsewhere after login.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_DESTINATION
  return next
}
