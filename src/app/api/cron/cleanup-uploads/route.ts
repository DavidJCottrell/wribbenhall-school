import { timingSafeEqual } from "node:crypto"

import { removeOrphanedUploads } from "@/lib/uploads-cleanup"

function isAuthorised(request: Request, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// Run daily by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
// Add ?dryRun=1 to see what would be removed without removing anything.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 })
  if (!isAuthorised(request, secret)) return new Response("Unauthorized", { status: 401 })

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1"

  try {
    return Response.json(await removeOrphanedUploads({ dryRun }))
  } catch (error) {
    console.error("[cron] upload cleanup failed", error)
    return new Response("Cleanup failed", { status: 500 })
  }
}
