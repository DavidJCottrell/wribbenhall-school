import { z } from "zod"

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `Enter ${label}`).max(max, `${label[0].toUpperCase()}${label.slice(1)} must be ${max} characters or fewer`)

const email = z.string().trim().min(1, "Enter your email address").pipe(z.email("Enter an email address in the correct format, like name@example.com"))

const ukPhone = z
  .string()
  .trim()
  .regex(/^(\+44\s?|0)[\d\s]{9,13}$/, "Enter a UK phone number, like 01299 123456 or 07700 900123")

const optionalPhone = z.union([z.literal(""), ukPhone])

const mustAgree = (message: string) => z.boolean().refine((value) => value, { message })

// Hidden field that people never see. Bots tend to fill it in.
const honeypot = z.string().max(0).optional()

export const enquiryTopics = [
  "Arranging a visit",
  "Admissions",
  "Transport",
  "Therapies and support",
  "Something else",
] as const

export const enquirerRoles = ["Parent or carer", "Professional", "Job seeker", "Other"] as const

export const enquirySchema = z.object({
  name: requiredText("your name", 120),
  email,
  phone: optionalPhone,
  role: z.enum(enquirerRoles, { error: "Tell us who you are" }),
  topic: z.enum(enquiryTopics, { error: "Choose what your enquiry is about" }),
  message: z.string().trim().min(10, "Tell us a little more, at least 10 characters").max(2000, "Message must be 2,000 characters or fewer"),
  privacyAccepted: mustAgree("Confirm you have read how we use your information"),
  website: honeypot,
})

export const yearGroups = [
  "Reception",
  ...Array.from({ length: 13 }, (_, index) => `Year ${index + 1}`),
  "Year 14",
] as const

export const ehcpStatuses = ["Has an EHCP", "Assessment in progress", "No EHCP yet"] as const

export const needAreas = [
  "Communication and interaction",
  "Cognition and learning",
  "Social, emotional and mental health",
  "Sensory and physical",
  "Medical",
] as const

export const placeApplicationSchema = z.object({
  childFirstName: requiredText("the child's first name", 80),
  childLastName: requiredText("the child's last name", 80),
  dateOfBirth: z
    .string()
    .min(1, "Enter the child's date of birth")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a real date of birth"),
  yearGroup: z.enum(yearGroups, { error: "Choose the year group the child is in now" }),
  currentSetting: requiredText("the name of the child's current school or nursery", 160),

  ehcpStatus: z.enum(ehcpStatuses, { error: "Choose the child's EHCP status" }),
  localAuthority: requiredText("the local authority", 120),
  needAreas: z.array(z.enum(needAreas)).min(1, "Choose at least one area of need"),
  needsSummary: z
    .string()
    .trim()
    .min(20, "Tell us a little about the child, at least 20 characters")
    .max(3000, "Keep this to 3,000 characters or fewer"),

  parentName: requiredText("your full name", 120),
  relationship: requiredText("your relationship to the child", 80),
  email,
  phone: ukPhone,
  addressLine: requiredText("your address", 200),
  postcode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, "Enter a real postcode, like DY12 1AA"),
  preferredContact: z.enum(["Email", "Phone"], { error: "Choose how you'd like us to contact you" }),

  consentToShare: mustAgree("Confirm we can contact the child's local authority and current setting"),
  declaration: mustAgree("Confirm the information is correct"),
  website: honeypot,
})

// Fields shown on each step of the application form, in order.
export const placeApplicationSteps = [
  {
    title: "About your child",
    fields: ["childFirstName", "childLastName", "dateOfBirth", "yearGroup", "currentSetting"],
  },
  {
    title: "Needs and support",
    fields: ["ehcpStatus", "localAuthority", "needAreas", "needsSummary"],
  },
  {
    title: "Your details",
    fields: ["parentName", "relationship", "email", "phone", "addressLine", "postcode", "preferredContact"],
  },
  {
    title: "Check and send",
    fields: ["consentToShare", "declaration"],
  },
] as const satisfies ReadonlyArray<{ title: string; fields: ReadonlyArray<keyof PlaceApplicationValues> }>

export const MAX_CV_BYTES = 5 * 1024 * 1024
export const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export const jobApplicationSchema = z.object({
  vacancySlug: z.string().min(1),
  fullName: requiredText("your full name", 120),
  email,
  phone: ukPhone,
  currentRole: z.string().trim().max(160).optional().default(""),
  supportingStatement: z
    .string()
    .trim()
    .min(100, "Your supporting statement needs to be at least 100 characters")
    .max(6000, "Keep your supporting statement to 6,000 characters or fewer"),
  rightToWork: mustAgree("Confirm you have the right to work in the UK"),
  declaration: mustAgree("Confirm the information is correct"),
  website: honeypot,
})

export type EnquiryValues = z.infer<typeof enquirySchema>
export type PlaceApplicationValues = z.infer<typeof placeApplicationSchema>
export type JobApplicationValues = z.input<typeof jobApplicationSchema>
