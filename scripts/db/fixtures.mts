// Fictional data for development and preview databases. Plain data only, so it can be tested and turned into SQL.
// Every login has the password in DEV_PASSWORD. Nothing here describes a real person.
import { allPermissions, normalizePermissions, type Permission } from "../../src/lib/auth/permissions"

export const DEV_PASSWORD = "dev-password-12345"
// A scrypt hash of DEV_PASSWORD, fixed so the generated SQL doesn't change every time. A test checks it still verifies.
export const DEV_PASSWORD_HASH =
  "8e334d0e0e99aa027d23a2f2274e09db:c7668b1585c0ec14df44322d62b371992f7c4d42d8209a36b48947698c61bbed66e2059f52eef38324438661c5db6db38f3d7854df458a79fb8493cec9e9323e"
export const TEST_EMAIL_DOMAIN = "@example.test"

export type FixtureUser = {
  id: string
  name: string
  email: string
  kind: "parent" | "staff"
  permissions: Permission[]
  description: string
}

const teacher = normalizePermissions(["attendance.record", "reports.write", "incidents.record", "medical.view"])
const learningSupport = normalizePermissions(["attendance.record", "reports.write", "incidents.record"])
const office = normalizePermissions(["pupils.manage", "attendance.manage", "reports.manage"])

export const users: FixtureUser[] = [
  { id: "seed-admin", name: "Robin Admin", email: "admin@example.test", kind: "staff", permissions: [...allPermissions], description: "Head teacher: every permission" },
  { id: "seed-staff-alex", name: "Alex Teacher", email: "staff@example.test", kind: "staff", permissions: teacher, description: "Teacher preset" },
  { id: "seed-staff-jo", name: "Jo Support", email: "staff2@example.test", kind: "staff", permissions: learningSupport, description: "Learning support preset" },
  { id: "seed-staff-office", name: "Olive Office", email: "office@example.test", kind: "staff", permissions: office, description: "Office preset" },
  { id: "seed-staff-basic", name: "Ben Basic", email: "basic@example.test", kind: "staff", permissions: [], description: "Staff with no permissions (baseline access only)" },
  { id: "seed-parent-pat", name: "Pat Example", email: "parent@example.test", kind: "parent", permissions: [], description: "Parent of River and Oak" },
  { id: "seed-parent-sam", name: "Sam Sample", email: "other-parent@example.test", kind: "parent", permissions: [], description: "Carer of Ash" },
  { id: "seed-parent-chris", name: "Chris Carer", email: "carer@example.test", kind: "parent", permissions: [], description: "Grandparent of Willow" },
]

export type FixturePupil = {
  id: string
  firstName: string
  lastName: string
  preferredName: string | null
  yearGroup: string
  dateOfBirth: string
  admissionDate: string
  keyWorkerId: string | null
  ehcpStatus: string | null
  localAuthority: string | null
  ehcpReviewDue: string | null
}

export const pupils: FixturePupil[] = [
  { id: "11111111-1111-4111-8111-111111111111", firstName: "River", lastName: "Example", preferredName: null, yearGroup: "Year 4", dateOfBirth: "2017-03-14", admissionDate: "2025-09-08", keyWorkerId: "seed-staff-alex", ehcpStatus: "Has an EHCP", localAuthority: "Test Council", ehcpReviewDue: "2027-02-10" },
  { id: "22222222-2222-4222-8222-222222222222", firstName: "Oak", lastName: "Example", preferredName: "Oakley", yearGroup: "Year 7", dateOfBirth: "2014-11-02", admissionDate: "2024-01-08", keyWorkerId: "seed-staff-jo", ehcpStatus: "Has an EHCP", localAuthority: "Test Council", ehcpReviewDue: "2026-12-04" },
  { id: "33333333-3333-4333-8333-333333333333", firstName: "Ash", lastName: "Sample", preferredName: null, yearGroup: "Year 2", dateOfBirth: "2019-06-21", admissionDate: "2026-04-13", keyWorkerId: "seed-staff-alex", ehcpStatus: "Assessment in progress", localAuthority: null, ehcpReviewDue: null },
  { id: "44444444-4444-4444-8444-444444444444", firstName: "Willow", lastName: "Brook", preferredName: null, yearGroup: "Year 10", dateOfBirth: "2011-01-30", admissionDate: "2023-09-04", keyWorkerId: "seed-staff-jo", ehcpStatus: "Has an EHCP", localAuthority: "Other Test Council", ehcpReviewDue: "2027-05-18" },
]

export type FixtureContact = {
  id: string
  pupilId: string
  name: string
  relationship: string
  phone: string | null
  email: string | null
  parentalResponsibility: boolean
  emergencyContact: boolean
  authorisedToCollect: boolean
  notes: string | null
  linkedUserId: string | null
}

export const contacts: FixtureContact[] = [
  { id: "c0000001-0000-4000-8000-000000000001", pupilId: pupils[0].id, name: "Pat Example", relationship: "Parent", phone: "07700 900101", email: "parent@example.test", parentalResponsibility: true, emergencyContact: true, authorisedToCollect: true, notes: null, linkedUserId: "seed-parent-pat" },
  { id: "c0000001-0000-4000-8000-000000000002", pupilId: pupils[0].id, name: "Gran Example", relationship: "Grandparent", phone: "07700 900102", email: null, parentalResponsibility: false, emergencyContact: true, authorisedToCollect: true, notes: "Collects on Fridays. This is fictional text.", linkedUserId: null },
  { id: "c0000002-0000-4000-8000-000000000001", pupilId: pupils[1].id, name: "Pat Example", relationship: "Parent", phone: "07700 900101", email: "parent@example.test", parentalResponsibility: true, emergencyContact: true, authorisedToCollect: true, notes: null, linkedUserId: "seed-parent-pat" },
  { id: "c0000003-0000-4000-8000-000000000001", pupilId: pupils[2].id, name: "Sam Sample", relationship: "Carer", phone: "07700 900103", email: "other-parent@example.test", parentalResponsibility: true, emergencyContact: true, authorisedToCollect: true, notes: null, linkedUserId: "seed-parent-sam" },
  { id: "c0000004-0000-4000-8000-000000000001", pupilId: pupils[3].id, name: "Chris Carer", relationship: "Grandparent", phone: "07700 900104", email: "carer@example.test", parentalResponsibility: true, emergencyContact: true, authorisedToCollect: true, notes: null, linkedUserId: "seed-parent-chris" },
]

export const guardianships = [
  { userId: "seed-parent-pat", pupilId: pupils[0].id, relationship: "Parent" },
  { userId: "seed-parent-pat", pupilId: pupils[1].id, relationship: "Parent" },
  { userId: "seed-parent-sam", pupilId: pupils[2].id, relationship: "Carer" },
  { userId: "seed-parent-chris", pupilId: pupils[3].id, relationship: "Grandparent" },
]

const note = "This is fictional text for development."

export type FixtureReport = { pupilId: string; authorId: string; title: string; body: string; daysAgo: number; visibleToParents: boolean }

export const reports: FixtureReport[] = [
  { pupilId: pupils[0].id, authorId: "seed-staff-alex", title: "Reading together", body: note, daysAgo: 1, visibleToParents: true },
  { pupilId: pupils[0].id, authorId: "seed-staff-jo", title: "Staff note: sensory break", body: note, daysAgo: 3, visibleToParents: false },
  { pupilId: pupils[0].id, authorId: "seed-staff-alex", title: "Swimming session", body: `${note}\nA second line, to check line breaks.`, daysAgo: 8, visibleToParents: true },
  { pupilId: pupils[1].id, authorId: "seed-staff-jo", title: "Art project", body: note, daysAgo: 2, visibleToParents: true },
  { pupilId: pupils[1].id, authorId: "seed-staff-jo", title: "Staff note: lunchtime routine", body: note, daysAgo: 6, visibleToParents: false },
  { pupilId: pupils[2].id, authorId: "seed-staff-alex", title: "Garden visit", body: note, daysAgo: 4, visibleToParents: true },
  { pupilId: pupils[3].id, authorId: "seed-staff-jo", title: "Work experience planning", body: note, daysAgo: 5, visibleToParents: true },
]
