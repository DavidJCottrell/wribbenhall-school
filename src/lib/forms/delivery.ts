import "server-only"

export type FormKind = "enquiry" | "place-application" | "job-application"

export interface FormSubmission {
  kind: FormKind
  reference: string
  receivedAt: string
  data: Record<string, unknown>
  attachments?: Array<{ name: string; type: string; size: number; content: ArrayBuffer }>
}

// Swap or add implementations here (email provider, CRM, MIS import) without touching the forms.
export interface FormDelivery {
  deliver(submission: FormSubmission): Promise<void>
}

const consoleDelivery: FormDelivery = {
  async deliver({ attachments, ...submission }) {
    console.info(
      `[forms] ${submission.kind} ${submission.reference}`,
      JSON.stringify(
        { ...submission, attachments: attachments?.map(({ name, type, size }) => ({ name, type, size })) },
        null,
        2,
      ),
    )
  },
}

function webhookDelivery(url: string): FormDelivery {
  return {
    async deliver({ attachments, ...submission }) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submission,
          attachments: attachments?.map(({ name, type, size, content }) => ({
            name,
            type,
            size,
            base64: Buffer.from(content).toString("base64"),
          })),
        }),
      })
      if (!response.ok) throw new Error(`Form webhook responded ${response.status}`)
    },
  }
}

export function getFormDelivery(): FormDelivery {
  const webhook = process.env.FORMS_WEBHOOK_URL
  return webhook ? webhookDelivery(webhook) : consoleDelivery
}
