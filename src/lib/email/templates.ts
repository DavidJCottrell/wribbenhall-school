import type { EmailMessage } from "./send"

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function passwordResetEmail({ to, name, link, validForMinutes }: { to: string; name: string; link: string; validForMinutes: number }): EmailMessage {
  const text = [
    `Hello ${name},`,
    "",
    "We received a request to reset the password for your Wribbenhall School login.",
    `Use this link within ${validForMinutes} minutes to choose a new password:`,
    "",
    link,
    "",
    "If you didn't ask for this, you can ignore this email. Your password will not change.",
  ].join("\n")

  const html = `<p>Hello ${escapeHtml(name)},</p>
<p>We received a request to reset the password for your Wribbenhall School login.</p>
<p><a href="${escapeHtml(link)}">Choose a new password</a></p>
<p>This link works for ${validForMinutes} minutes. If you didn't ask for this, you can ignore this email. Your password will not change.</p>`

  return { to, subject: "Reset your Wribbenhall School password", text, html }
}
