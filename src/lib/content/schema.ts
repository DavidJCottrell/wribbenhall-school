import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm")

// A media key is a path relative to the media root, e.g. "gallery/forest-school/01.jpg".
// See src/lib/media.ts for how keys resolve to local files or a CDN.
export const mediaAssetSchema = z.object({
  key: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const schoolSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  ageRange: z.string(),
  address: z.object({
    lines: z.array(z.string()),
    postcode: z.string(),
    mapUrl: z.url(),
  }),
  phone: z.string(),
  email: z.email(),
  admissionsEmail: z.email(),
  recruitmentEmail: z.email(),
  officeHours: z.array(z.object({ days: z.string(), hours: z.string() })),
  headteacher: z.object({
    name: z.string(),
    role: z.string(),
    portrait: mediaAssetSchema,
    welcome: z.array(z.string()),
  }),
  heroImage: mediaAssetSchema,
  pathways: z.array(
    z.object({
      name: z.string(),
      summary: z.string(),
    }),
  ),
  localAuthority: z.string(),
  ofstedUrl: z.url(),
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
})

export const policyCategorySchema = z.enum([
  "Safeguarding",
  "SEND and inclusion",
  "Curriculum",
  "Behaviour and wellbeing",
  "Governance",
  "Statutory information",
])

export const policyDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: policyCategorySchema,
  summary: z.string(),
  file: z.object({
    key: z.string(),
    format: z.enum(["pdf", "docx"]),
    sizeBytes: z.number().int().nonnegative(),
  }),
  updated: isoDate,
  reviewDue: isoDate.optional(),
})

export const galleryAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: isoDate,
  images: z.array(mediaAssetSchema.extend({ caption: z.string().optional() })),
})

export const vacancySchema = z.object({
  slug: z.string(),
  title: z.string(),
  contract: z.enum(["Permanent", "Fixed term", "Supply", "Volunteer"]),
  hours: z.string(),
  salary: z.string(),
  closingDate: isoDate,
  interviewDate: isoDate.optional(),
  startDate: z.string(),
  summary: z.string(),
  about: z.array(z.string()),
  responsibilities: z.array(z.string()),
  personSpecification: z.array(z.string()),
  applicationPack: z
    .object({ key: z.string(), sizeBytes: z.number().int().nonnegative() })
    .optional(),
})

export type MediaAsset = z.infer<typeof mediaAssetSchema>
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
