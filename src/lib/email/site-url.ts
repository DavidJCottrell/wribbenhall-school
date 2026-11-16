import "server-only"

// The address used in links we email. Never taken from the incoming request,
// so a forged Host header can't point a reset link at another site.
export function getSiteUrl(): string | null {
  const configured = process.env.BETTER_AUTH_URL
  if (configured) return configured.replace(/\/+$/, "")

  // The live site must say where it lives.
  if (process.env.VERCEL_ENV === "production") return null

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
