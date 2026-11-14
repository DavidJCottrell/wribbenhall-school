// Media keys are stored without a host so the same content works locally and on a CDN.
// Locally they resolve to /public/media; set NEXT_PUBLIC_MEDIA_BASE_URL to serve from a CDN.
const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "")

export function mediaUrl(key: string) {
  const path = key.replace(/^\/+/, "")
  return mediaBaseUrl ? `${mediaBaseUrl}/${path}` : `/media/${path}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
