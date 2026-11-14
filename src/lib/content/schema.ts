import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm")

// A media key is a path relative to the media root, e.g. "gallery/our-school/01.jpg".
// See src/lib/media.ts for how keys resolve to local files or a CDN.
export const mediaAssetSchema = z.object({
  key: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

// A document is either a file in the media store (key) or a link to wherever it already lives (url),
// such as Google Drive. Exactly one of the two is set.
export const documentFileSchema = z
  .object({
    key: z.string().min(1).optional(),
    url: z.url().optional(),
    format: z.enum(["pdf", "docx", "doc", "gdoc"]),
    sizeBytes: z.number().int().nonnegative().optional(),
  })
  .refine((file) => Boolean(file.key) !== Boolean(file.url), {
    message: "Set either key or url on a document, not both",
  })

const contactPersonSchema = z.object({
  role: z.string(),
  name: z.string(),
  email: z.email().optional(),
  phone: z.string().optional(),
})

export const schoolSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  ageRange: z.string(),
  mission: z.array(z.string()).min(1),
  inspectionQuote: z.object({ text: z.string(), source: z.string() }).optional(),
  address: z.object({
    lines: z.array(z.string()),
    postcode: z.string(),
    mapUrl: z.url(),
  }),
  phone: z.string(),
  email: z.email(),
  vatNumber: z.string().optional(),
  people: z.array(contactPersonSchema),
  heroImage: mediaAssetSchema,
  aboutImage: mediaAssetSchema,
  sendProvision: z.object({
    heading: z.string(),
    text: z.string(),
    reportUrl: z.string().optional(),
  }),
  features: z.array(z.object({ title: z.string(), text: z.string() })),
  pupilProfile: z.object({
    summary: z.array(z.string()),
    mainNeeds: z.array(z.string()),
    mayInclude: z.array(z.string()),
    notProvidedFor: z.array(z.string()),
    decisions: z.array(z.string()),
  }),
  recognition: z.array(
    z.object({
      title: z.string(),
      text: z.string(),
      image: mediaAssetSchema.optional(),
      link: z.object({ label: z.string(), url: z.url() }).optional(),
    }),
  ),
  staff: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      bio: z.string(),
      portrait: mediaAssetSchema,
    }),
  ),
  calendarSubscribeUrl: z.url().optional(),
})

export const eventCategorySchema = z.enum(["term", "parents", "school", "community", "inset"])

export const schoolEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: isoDate,
  endDate: isoDate.optional(),
  startTime: clockTime.optional(),
  endTime: clockTime.optional(),
  location: z.string().optional(),
  category: eventCategorySchema,
  description: z.string().optional(),
})

export const termSchema = z.object({
  name: z.string(),
  start: isoDate,
  end: isoDate,
  halfTerm: z.object({ start: isoDate, end: isoDate }).optional(),
})

export const academicYearSchema = z.object({
  label: z.string(),
  terms: z.array(termSchema),
  insetDays: z.array(isoDate),
  otherClosures: z.array(z.object({ name: z.string(), start: isoDate, end: isoDate })).default([]),
})

export const policyCategorySchema = z.enum(["School policies", "Inspections", "Safeguarding", "Supporting families"])

export const policyDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: policyCategorySchema,
  summary: z.string().optional(),
  file: documentFileSchema,
  updated: isoDate.optional(),
  reviewDue: isoDate.optional(),
})

export const galleryAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: isoDate.optional(),
  images: z.array(mediaAssetSchema.extend({ caption: z.string().optional() })),
})

export const vacancySchema = z.object({
  slug: z.string(),
  title: z.string(),
  contract: z.enum(["Permanent", "Fixed term", "Supply", "Volunteer"]),
  hours: z.string(),
  salary: z.string(),
  closingDate: isoDate,
  closingTime: z.string().optional(),
  interviewDate: isoDate.optional(),
  startDate: z.string(),
  summary: z.string(),
  about: z.array(z.string()),
  responsibilities: z.array(z.string()),
  personSpecification: z.array(z.string()),
  howToApply: z.array(z.string()),
  documents: z.array(z.object({ title: z.string(), file: documentFileSchema })),
})

export type MediaAsset = z.infer<typeof mediaAssetSchema>
export type DocumentFile = z.infer<typeof documentFileSchema>
export type School = z.infer<typeof schoolSchema>
export type EventCategory = z.infer<typeof eventCategorySchema>
export type SchoolEvent = z.infer<typeof schoolEventSchema>
export type AcademicYear = z.infer<typeof academicYearSchema>
export type PolicyCategory = z.infer<typeof policyCategorySchema>
export type PolicyDocument = z.infer<typeof policyDocumentSchema>
export type GalleryAlbum = z.infer<typeof galleryAlbumSchema>
export type GalleryImage = GalleryAlbum["images"][number]
export type Vacancy = z.infer<typeof vacancySchema>

// One schema per collection. Remote providers are expected to serve these shapes.
export const collections = {
  school: schoolSchema,
  events: z.array(schoolEventSchema),
  academicYears: z.array(academicYearSchema),
  policies: z.array(policyDocumentSchema),
  gallery: z.array(galleryAlbumSchema),
  vacancies: z.array(vacancySchema),
} as const

export type CollectionName = keyof typeof collections
export type CollectionData<K extends CollectionName> = z.infer<(typeof collections)[K]>
