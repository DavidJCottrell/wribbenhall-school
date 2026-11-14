"use server"

import { z } from "zod"

import { getFormDelivery, type FormKind, type FormSubmission } from "@/lib/forms/delivery"
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
  enquirySchema,
  jobApplicationSchema,
  placeApplicationSchema,
} from "@/lib/forms/schemas"

export type FormResult =
  | { ok: true; reference: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }

const prefixes: Record<FormKind, string> = {
  enquiry: "ENQ",
  "place-application": "APP",
  "job-application": "JOB",
}


function createReference(kind: FormKind) {
  return `${prefixes[kind]}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function deliver(kind: FormKind, data: Record<string, unknown>, attachments?: FormSubmission["attachments"]): Promise<FormResult> {
  const { website, ...fields } = data
  const reference = createReference(kind)

  // Honeypot filled in: pretend it worked and drop it.
  if (website) return { ok: true, reference }

  try {
    await getFormDelivery().deliver({
      kind,
      reference,
      receivedAt: new Date().toISOString(),
      data: fields,
      attachments,
    })
    return { ok: true, reference }
  } catch (error) {
    console.error(`[forms] ${kind} delivery failed`, error)
    return {
      ok: false,
      message: "Your form couldn't be sent. Please try again, or email the school office directly.",
    }
  }
}

function invalid(error: z.ZodError): FormResult {
  return {
    ok: false,
    message: "Some answers need checking. Correct the highlighted fields and send the form again.",
    fieldErrors: z.flattenError(error).fieldErrors,
  }
}

export async function submitEnquiry(values: unknown): Promise<FormResult> {
  const parsed = enquirySchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return deliver("enquiry", parsed.data)
}

export async function submitPlaceApplication(values: unknown): Promise<FormResult> {
  const parsed = placeApplicationSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return deliver("place-application", parsed.data)
}

export async function submitJobApplication(formData: FormData): Promise<FormResult> {
  const upload = formData.get("applicationForm")
  const parsed = jobApplicationSchema.safeParse({
    vacancySlug: formData.get("vacancySlug"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message") ?? "",
    rightToWork: formData.get("rightToWork") === "true",
    declaration: formData.get("declaration") === "true",
    website: formData.get("website") ?? "",
  })
  if (!parsed.success) return invalid(parsed.error)

  if (!(upload instanceof File) || upload.size === 0) {
    return {
      ok: false,
      message: "Attach your completed application form.",
      fieldErrors: { applicationForm: ["Attach your completed application form"] },
    }
  }
  if (upload.size > MAX_UPLOAD_BYTES || !UPLOAD_TYPES.includes(upload.type)) {
    return {
      ok: false,
      message: "Your application form must be a PDF or Word document under 5 MB.",
      fieldErrors: { applicationForm: ["Upload a PDF or Word document under 5 MB"] },
    }
  }

  return deliver("job-application", parsed.data, [
    { name: upload.name, type: upload.type, size: upload.size, content: await upload.arrayBuffer() },
  ])
}
