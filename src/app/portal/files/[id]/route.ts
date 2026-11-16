import { get } from "@vercel/blob"
import { z } from "zod"

import { getCurrentUser } from "@/lib/auth/session"
import { getFileFor } from "@/lib/portal/files"
import { isInlineType } from "@/lib/uploads"

const notFound = () => new Response("Not found", { status: 404 })

function contentDisposition(filename: string, inline: boolean) {
  const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return `${inline ? "inline" : "attachment"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export async function GET(_request: Request, context: RouteContext<"/portal/files/[id]">) {
  const user = await getCurrentUser()
  if (!user) return new Response("Please log in", { status: 401 })
  if (user.mustChangePassword) return new Response("Please choose your own password first", { status: 403 })

  const { id } = await context.params
  if (!z.uuid().safeParse(id).success) return notFound()

  const file = await getFileFor(user, id)
  if (!file) return notFound()

  const blob = await get(file.pathname, { access: "private" })
  if (!blob || blob.statusCode !== 200) return notFound()

  return new Response(blob.stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      // Only images open in the browser. Everything else downloads, so uploaded documents never run on this site.
      "Content-Disposition": contentDisposition(file.filename, isInlineType(file.contentType)),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  })
}
