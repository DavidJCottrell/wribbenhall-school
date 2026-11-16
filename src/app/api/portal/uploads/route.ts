import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/auth/session"
import { getChildFor } from "@/lib/portal/children"
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  isAttachmentPathFor,
} from "@/lib/uploads"

const payloadSchema = z.object({ childId: z.uuid() })

// Issues short-lived tokens so the browser can upload straight to Blob, past Vercel's request size limit.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser()
        if (!user || user.mustChangePassword || user.role === "parent") throw new Error("Not allowed")

        const payload = payloadSchema.safeParse(JSON.parse(clientPayload ?? "null"))
        if (!payload.success) throw new Error("Bad request")

        const { childId } = payload.data
        if (!isAttachmentPathFor(childId, pathname) || !(await getChildFor(user, childId))) {
          throw new Error("Not allowed")
        }

        return {
          allowedContentTypes: [...ALLOWED_ATTACHMENT_TYPES],
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
          addRandomSuffix: true,
        }
      },
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "The upload isn't allowed." }, { status: 400 })
  }
}
