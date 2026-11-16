import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import type { Permission } from "@/lib/auth/permissions"
import { getActionUser } from "@/lib/auth/session"
import { getPupilFor } from "@/lib/portal/pupils"
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  isAttachmentPathFor,
} from "@/lib/uploads"

// What the upload is for decides who may make it. Later record types add their own purpose here.
const PURPOSE_PERMISSIONS = { day_report: "reports.write" } as const satisfies Record<string, Permission>

const payloadSchema = z.object({ childId: z.uuid(), purpose: z.enum(Object.keys(PURPOSE_PERMISSIONS) as [keyof typeof PURPOSE_PERMISSIONS]) })

// Issues short-lived tokens so the browser can upload straight to Blob, past Vercel's request size limit.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = payloadSchema.safeParse(JSON.parse(clientPayload ?? "null"))
        if (!payload.success) throw new Error("Bad request")

        const gate = await getActionUser(PURPOSE_PERMISSIONS[payload.data.purpose])
        if (!gate.ok) throw new Error("Not allowed")
        const user = gate.user

        const { childId } = payload.data
        if (!isAttachmentPathFor(childId, pathname) || !(await getPupilFor(user, childId))) {
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
