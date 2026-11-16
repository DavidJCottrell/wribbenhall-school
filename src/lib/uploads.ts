export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_FILES_PER_RECORD = 5

export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.docx"

// Shown to people choosing files, so it says what they'd recognise rather than MIME types.
export const ATTACHMENT_HELP = "PDF, Word (.docx) or image (JPG, PNG, WebP). Up to 5 files, 10 MB each."

export function isAllowedAttachmentType(type: string) {
  return (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(type)
}

export function attachmentPrefix(childId: string) {
  return `children/${childId}/`
}

// Blobs for a child must live under that child's folder, with a plain filename.
export function isAttachmentPathFor(childId: string, pathname: string) {
  return pathname.startsWith(attachmentPrefix(childId)) && /^[A-Za-z0-9._-]{1,160}$/.test(pathname.slice(attachmentPrefix(childId).length))
}

export function safeStorageName(filename: string) {
  return filename.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(-80) || "file"
}

export function isInlineType(contentType: string) {
  return contentType.startsWith("image/")
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export type UploadedAttachment = { pathname: string; filename: string }
