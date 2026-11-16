import { isValid, parseISO } from "date-fns"
import { z } from "zod"

import { isPermission, userKinds, type Permission } from "@/lib/auth/permissions"

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

export const enquiryTopics = ["Admissions", "Arranging a visit", "Vacancies", "Something else"] as const

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
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
  "Year 13",
] as const

export const ehcpStatuses = ["Has an EHCP", "Assessment in progress", "No EHCP yet"] as const

// Matches the school's pupil profile (src/content/school.json)
export const needAreas = [
  "Anxiety",
  "Social phobia or school phobia",
  "Selective mutism",
  "Panic disorder",
  "Agoraphobia",
  "Separation anxiety or school refusal",
  "Attachment disorder",
  "Autism",
  "Depression",
  "Self-harm",
  "Other",
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

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOAD_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export const jobApplicationSchema = z.object({
  vacancySlug: z.string().min(1),
  fullName: requiredText("your full name", 120),
  email,
  phone: ukPhone,
  message: z.string().trim().max(2000, "Keep your message to 2,000 characters or fewer").optional().default(""),
  rightToWork: mustAgree("Confirm you have the right to work in the UK"),
  declaration: mustAgree("Confirm the information is correct"),
  website: honeypot,
})

export type EnquiryValues = z.infer<typeof enquirySchema>
export type PlaceApplicationValues = z.infer<typeof placeApplicationSchema>
export type JobApplicationValues = z.input<typeof jobApplicationSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
})

export type LoginValues = z.infer<typeof loginSchema>

export const REPORT_SESSIONS = [
  { value: "all_day", label: "All day" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
] as const

export const dayReportSchema = z.object({
  title: requiredText("a title", 120),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of the report")
    .refine((value) => isValid(parseISO(value)), "Enter a real date"),
  // Empty means not set. The server stores that as null.
  session: z.enum(["all_day", "morning", "afternoon", ""]),
  subject: z.string().trim().max(80, "The subject must be 80 characters or fewer"),
  body: z.string().trim().min(1, "Enter the report").max(5000, "The report must be 5,000 characters or fewer"),
  visibleToParents: z.boolean(),
})

export type DayReportValues = z.infer<typeof dayReportSchema>

export const MIN_PASSWORD_LENGTH = 12

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(128, "Use 128 characters or fewer"),
    confirmPassword: z.string().min(1, "Enter your new password again"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords don't match",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a different password from your current one",
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const createUserSchema = z.object({
  name: requiredText("their name", 120),
  email,
  kind: z.enum(userKinds, { error: "Choose parent or staff" }),
  // Only staff can hold permissions. The server ignores any sent for a parent.
  permissions: z.array(z.custom<Permission>(isPermission, "Unknown permission")),
})

export type CreateUserValues = z.infer<typeof createUserSchema>

// An empty string means "not set", which is how the forms send an empty optional date.
const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))), `Enter a real date for ${label}`)

export const pupilProfileSchema = z.object({
  firstName: requiredText("a first name", 80),
  lastName: requiredText("a last name", 80),
  preferredName: z.string().trim().max(80, "Preferred name must be 80 characters or fewer"),
  yearGroup: z.enum(yearGroups, { error: "Choose a year group" }),
  dateOfBirth: optionalDate("the date of birth"),
  admissionDate: optionalDate("the admission date"),
  leavingDate: optionalDate("the leaving date"),
  // The id of a member of staff, or empty for none.
  keyWorkerId: z.string().trim(),
  ehcpStatus: z.union([z.literal(""), z.enum(ehcpStatuses)]),
  localAuthority: z.string().trim().max(120, "Local authority must be 120 characters or fewer"),
  ehcpReviewDue: optionalDate("the EHCP review"),
})

export type PupilProfileValues = z.infer<typeof pupilProfileSchema>

export const createPupilSchema = pupilProfileSchema.pick({ firstName: true, lastName: true, yearGroup: true })

export type CreatePupilValues = z.infer<typeof createPupilSchema>

const optionalEmail = z.union([z.literal(""), email])

export const contactSchema = z
  .object({
    name: requiredText("their name", 120),
    relationship: requiredText("their relationship to the pupil", 80),
    phone: optionalPhone,
    email: optionalEmail,
    parentalResponsibility: z.boolean(),
    emergencyContact: z.boolean(),
    authorisedToCollect: z.boolean(),
    notes: z.string().trim().max(500, "Notes must be 500 characters or fewer"),
    // The id of a parent login this contact is the same person as, or empty.
    linkedUserId: z.string().trim(),
  })
  .refine((values) => !values.emergencyContact || values.phone !== "", {
    path: ["phone"],
    message: "An emergency contact needs a phone number",
  })

export type ContactValues = z.infer<typeof contactSchema>

export const linkGuardianSchema = z.object({
  userId: z.string().min(1, "Choose a parent or carer"),
  relationship: z.string().trim().max(60, "Relationship must be 60 characters or fewer"),
})

export type LinkGuardianValues = z.infer<typeof linkGuardianSchema>

export const forgotPasswordSchema = z.object({ email })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(128, "Use 128 characters or fewer"),
    confirmPassword: z.string().min(1, "Enter your new password again"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords don't match",
  })

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
