import "server-only"

export type EmailMessage = {
  to: string
  subject: string
  text: string
  html: string
}

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export function isLiveSite() {
  return process.env.VERCEL_ENV === "production"
}

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    // Only the live site must send for real. Elsewhere the email is printed, so it can be tested without a provider.
    if (isLiveSite()) throw new Error("RESEND_API_KEY and EMAIL_FROM must be set to send email")
    console.info(`[email:not sent, no provider configured] to ${message.to}: ${message.subject}\n${message.text}`)
    return
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  })

  if (!response.ok) throw new Error(`Email provider responded with ${response.status}`)
}
