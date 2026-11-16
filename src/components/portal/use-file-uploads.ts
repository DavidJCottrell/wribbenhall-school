"use client"

import { upload } from "@vercel/blob/client"
import { useState } from "react"
import { toast } from "sonner"

import { attachmentPrefix, safeStorageName, type UploadedAttachment } from "@/lib/uploads"

// Files are uploaded straight to Blob before the record is saved. What they are for decides who may upload them.
export function useFileUploads(childId: string, purpose: "day_report" | "incident") {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  // Kept between attempts, so a failed save doesn't upload the same files again.
  const [uploaded] = useState(() => new Map<File, UploadedAttachment>())

  async function uploadAll(): Promise<UploadedAttachment[] | null> {
    const results: UploadedAttachment[] = []
    for (const [index, file] of files.entries()) {
      let result = uploaded.get(file)
      if (!result) {
        setProgress(`Uploading file ${index + 1} of ${files.length}`)
        try {
          const blob = await upload(`${attachmentPrefix(childId)}${crypto.randomUUID()}-${safeStorageName(file.name)}`, file, {
            access: "private",
            handleUploadUrl: "/api/portal/uploads",
            clientPayload: JSON.stringify({ childId, purpose }),
          })
          result = { pathname: blob.pathname, filename: file.name }
          uploaded.set(file, result)
        } catch {
          toast.error(`${file.name} couldn't be uploaded. Please try again.`)
          setProgress(null)
          return null
        }
      }
      results.push(result)
    }
    setProgress(null)
    return results
  }

  function reset() {
    setFiles([])
    uploaded.clear()
  }

  return { files, setFiles, progress, uploadAll, reset }
}
