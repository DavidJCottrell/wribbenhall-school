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

export type FixtureReport = {
  pupilId: string
  authorId: string
  title: string
  body: string
  daysAgo: number
  session: "morning" | "afternoon" | "all_day" | null
  subject: string | null
  visibleToParents: boolean
}

export const reports: FixtureReport[] = [
  { pupilId: pupils[0].id, authorId: "seed-staff-alex", title: "Reading together", body: note, daysAgo: 1, session: "morning", subject: "English", visibleToParents: true },
  { pupilId: pupils[0].id, authorId: "seed-staff-jo", title: "Staff note: sensory break", body: note, daysAgo: 3, session: "afternoon", subject: null, visibleToParents: false },
  { pupilId: pupils[0].id, authorId: "seed-staff-alex", title: "Swimming session", body: `${note}\nA second line, to check line breaks.`, daysAgo: 8, session: "afternoon", subject: "PE", visibleToParents: true },
  { pupilId: pupils[0].id, authorId: "seed-staff-jo", title: "A calm day", body: note, daysAgo: 1, session: "all_day", subject: null, visibleToParents: true },
  { pupilId: pupils[1].id, authorId: "seed-staff-jo", title: "Art project", body: note, daysAgo: 2, session: "afternoon", subject: "Art", visibleToParents: true },
  { pupilId: pupils[1].id, authorId: "seed-staff-jo", title: "Staff note: lunchtime routine", body: note, daysAgo: 6, session: null, subject: null, visibleToParents: false },
  { pupilId: pupils[2].id, authorId: "seed-staff-alex", title: "Garden visit", body: note, daysAgo: 4, session: "morning", subject: "Science", visibleToParents: true },
  { pupilId: pupils[3].id, authorId: "seed-staff-jo", title: "Work experience planning", body: note, daysAgo: 5, session: "morning", subject: "Careers", visibleToParents: true },
]

// Plain markers in the text let the permission tests prove what a parent can and can't see.
export const PARENT_SAFE_MARKER = "FICTIONAL-PARENT-SUMMARY"
export const STAFF_ONLY_MARKER = "FICTIONAL-STAFF-ONLY-DETAIL"

export type FixtureIncident = {
  id: string
  pupilId: string
  createdBy: string
  daysAgo: number
  time: string
  type: "behaviour" | "accident_injury" | "physical_intervention" | "bullying" | "other"
  severity: "low" | "medium" | "high"
  location: string | null
  summary: string
  description: string
  status: "open" | "under_review" | "closed"
  reviewedBy: string | null
  reviewNotes: string | null
  shareWithParents: boolean
  parentSummary: string | null
  injury: string | null
  firstAid: string | null
  intervention: { technique: string; minutes: number; staff: string; debrief: string } | null
  parentsInformed: { daysAgo: number; by: string; how: "phone" | "in_person" | "email" | "message" | "letter" } | null
  involved: { pupilId: string; role: "involved" | "witness" }[]
}

export const incidents: FixtureIncident[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    pupilId: pupils[0].id,
    createdBy: "seed-staff-alex",
    daysAgo: 2,
    time: "10:15",
    type: "behaviour",
    severity: "medium",
    location: "Classroom",
    summary: "Difficult start to the morning",
    description: `${STAFF_ONLY_MARKER} ${note}`,
    status: "closed",
    reviewedBy: "seed-admin",
    reviewNotes: "Followed the agreed plan. Nothing further needed.",
    shareWithParents: true,
    parentSummary: `${PARENT_SAFE_MARKER} River found the start of the day hard. A member of staff sat with them and they were back in class within twenty minutes.`,
    injury: null,
    firstAid: null,
    intervention: null,
    parentsInformed: { daysAgo: 2, by: "Alex Teacher", how: "phone" },
    involved: [],
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    pupilId: pupils[0].id,
    createdBy: "seed-staff-jo",
    daysAgo: 9,
    time: "13:40",
    type: "accident_injury",
    severity: "low",
    location: "Playground",
    summary: "Grazed knee at break",
    description: `${STAFF_ONLY_MARKER} ${note}`,
    status: "closed",
    reviewedBy: "seed-admin",
    reviewNotes: null,
    shareWithParents: false,
    parentSummary: null,
    injury: "Small graze to the left knee.",
    firstAid: "Cleaned and a plaster applied.",
    intervention: null,
    parentsInformed: null,
    involved: [],
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    pupilId: pupils[1].id,
    createdBy: "seed-staff-alex",
    daysAgo: 4,
    time: "11:05",
    type: "physical_intervention",
    severity: "high",
    location: "Corridor",
    summary: "Needed support to stay safe",
    description: `${STAFF_ONLY_MARKER} ${note}`,
    status: "under_review",
    reviewedBy: null,
    reviewNotes: null,
    shareWithParents: false,
    parentSummary: `${PARENT_SAFE_MARKER} Draft, not yet shared.`,
    injury: null,
    firstAid: null,
    intervention: { technique: "Fictional technique", minutes: 4, staff: "Alex Teacher, Jo Support", debrief: "Fictional debrief with the pupil and staff." },
    parentsInformed: { daysAgo: 4, by: "Alex Teacher", how: "in_person" },
    involved: [{ pupilId: pupils[2].id, role: "witness" }],
  },
  {
    id: "a4444444-4444-4444-8444-444444444444",
    pupilId: pupils[2].id,
    createdBy: "seed-staff-alex",
    daysAgo: 1,
    time: "12:20",
    type: "bullying",
    severity: "medium",
    location: "Dining room",
    summary: "Unkind comments at lunch",
    description: `${STAFF_ONLY_MARKER} ${note}`,
    status: "open",
    reviewedBy: null,
    reviewNotes: null,
    shareWithParents: false,
    parentSummary: null,
    injury: null,
    firstAid: null,
    intervention: null,
    parentsInformed: null,
    involved: [{ pupilId: pupils[1].id, role: "involved" }],
  },
]

// Markers in the text let the permission tests prove what a parent can and can't see.
export const ACTION_PLAN_MARKER = "FICTIONAL-ACTION-PLAN"
export const MEDICATION_NOTES_MARKER = "FICTIONAL-MEDICATION-NOTES"

export type FixtureCondition = {
  id: string
  pupilId: string
  kind: "condition" | "allergy" | "dietary" | "other"
  name: string
  severity: "mild" | "moderate" | "severe"
  signs: string | null
  actionPlan: string | null
  alert: boolean
  active: boolean
  visibleToParents: boolean
}

export const conditions: FixtureCondition[] = [
  {
    id: "b1111111-1111-4111-8111-111111111111",
    pupilId: pupils[0].id,
    kind: "allergy",
    name: "Peanut allergy",
    severity: "severe",
    signs: "Swelling of the lips, wheezing, hives.",
    actionPlan: `${ACTION_PLAN_MARKER} Use the auto-injector from the office, then call 999.`,
    alert: true,
    active: true,
    visibleToParents: true,
  },
  {
    id: "b2222222-2222-4222-8222-222222222222",
    pupilId: pupils[0].id,
    kind: "condition",
    name: "Hay fever (staff note)",
    severity: "mild",
    signs: null,
    actionPlan: null,
    alert: false,
    active: true,
    visibleToParents: false,
  },
  {
    id: "b3333333-3333-4333-8333-333333333333",
    pupilId: pupils[2].id,
    kind: "dietary",
    name: "Gluten free",
    severity: "moderate",
    signs: "Stomach pain after eating wheat.",
    actionPlan: `${ACTION_PLAN_MARKER} Check the lunch menu with the kitchen.`,
    alert: true,
    active: true,
    visibleToParents: true,
  },
]

export type FixtureMedication = {
  id: string
  pupilId: string
  name: string
  dose: string
  route: "oral" | "inhaled" | "topical" | "injection" | "eye_drops" | "other"
  frequency: string | null
  scheduledTimes: string[]
  asRequired: boolean
  maxDailyDoses: number | null
  prescriber: string | null
  startsDaysAgo: number | null
  // Negative means already expired.
  expiresInDays: number | null
  storage: string | null
  consentDaysAgo: number | null
  notes: string | null
  active: boolean
}

export const medications: FixtureMedication[] = [
  {
    id: "c1111111-1111-4111-8111-111111111111",
    pupilId: pupils[0].id,
    name: "Fictional reliever inhaler",
    dose: "2 puffs",
    route: "inhaled",
    frequency: "When needed",
    scheduledTimes: [],
    asRequired: true,
    maxDailyDoses: 4,
    prescriber: "Dr Fictional",
    startsDaysAgo: 60,
    expiresInDays: 200,
    storage: "Office cupboard",
    consentDaysAgo: 55,
    notes: `${MEDICATION_NOTES_MARKER} Shake before use.`,
    active: true,
  },
  {
    id: "c2222222-2222-4222-8222-222222222222",
    pupilId: pupils[1].id,
    name: "Fictional tablet",
    dose: "5 mg",
    route: "oral",
    frequency: "Twice on school days",
    scheduledTimes: ["08:30", "12:30"],
    asRequired: false,
    maxDailyDoses: null,
    prescriber: "Dr Fictional",
    startsDaysAgo: 90,
    expiresInDays: 20,
    storage: "Locked cabinet",
    consentDaysAgo: 85,
    notes: `${MEDICATION_NOTES_MARKER} Give with food.`,
    active: true,
  },
  {
    id: "c3333333-3333-4333-8333-333333333333",
    pupilId: pupils[1].id,
    name: "Fictional expired cream",
    dose: "Thin layer",
    route: "topical",
    frequency: "When needed",
    scheduledTimes: [],
    asRequired: true,
    maxDailyDoses: null,
    prescriber: null,
    startsDaysAgo: 200,
    expiresInDays: -3,
    storage: null,
    consentDaysAgo: 190,
    notes: null,
    active: true,
  },
  {
    id: "c4444444-4444-4444-8444-444444444444",
    pupilId: pupils[2].id,
    name: "Fictional liquid",
    dose: "5 ml",
    route: "oral",
    frequency: "Once each school day",
    scheduledTimes: ["09:00"],
    asRequired: false,
    maxDailyDoses: null,
    prescriber: null,
    startsDaysAgo: 5,
    expiresInDays: 300,
    storage: "Fridge in the office",
    consentDaysAgo: null,
    notes: null,
    active: true,
  },
]

export type FixtureDose = {
  medicationId: string
  pupilId: string
  daysAgo: number
  time: string
  scheduledFor: string | null
  outcome: "given" | "refused" | "missed" | "not_needed"
  dose: string | null
  givenBy: string
  witnessedBy: string | null
  notes: string | null
  voidReason: string | null
}

export const medicationLog: FixtureDose[] = [
  { medicationId: medications[1].id, pupilId: pupils[1].id, daysAgo: 0, time: "08:35", scheduledFor: "08:30", outcome: "given", dose: "5 mg", givenBy: "seed-admin", witnessedBy: "seed-staff-alex", notes: null, voidReason: null },
  { medicationId: medications[1].id, pupilId: pupils[1].id, daysAgo: 1, time: "08:32", scheduledFor: "08:30", outcome: "given", dose: "5 mg", givenBy: "seed-admin", witnessedBy: null, notes: null, voidReason: null },
  { medicationId: medications[1].id, pupilId: pupils[1].id, daysAgo: 1, time: "12:40", scheduledFor: "12:30", outcome: "refused", dose: null, givenBy: "seed-admin", witnessedBy: "seed-staff-jo", notes: "Said they felt sick. Fictional text.", voidReason: null },
  { medicationId: medications[0].id, pupilId: pupils[0].id, daysAgo: 3, time: "10:50", scheduledFor: null, outcome: "given", dose: "2 puffs", givenBy: "seed-admin", witnessedBy: null, notes: "After playtime.", voidReason: null },
  { medicationId: medications[0].id, pupilId: pupils[0].id, daysAgo: 3, time: "10:55", scheduledFor: null, outcome: "given", dose: "2 puffs", givenBy: "seed-admin", witnessedBy: null, notes: null, voidReason: "Recorded against the wrong pupil. Fictional text." },
]

// How often each pupil is marked each way, out of 100 sessions. The marks are picked by a repeatable hash of
// pupil, day and session, so every run produces the same pattern. Unauthorised absence fills the remainder.
export type AttendanceProfile = { pupilId: string; present: number; late: number; illness: number; medical: number; authorisedOther: number }

export const attendanceProfiles: AttendanceProfile[] = [
  { pupilId: pupils[0].id, present: 88, late: 4, illness: 4, medical: 2, authorisedOther: 1 }, // about 92%
  { pupilId: pupils[1].id, present: 80, late: 5, illness: 6, medical: 3, authorisedOther: 2 }, // about 85%, below the 90% line
  { pupilId: pupils[2].id, present: 94, late: 3, illness: 2, medical: 1, authorisedOther: 0 }, // about 97%
  { pupilId: pupils[3].id, present: 62, late: 4, illness: 12, medical: 4, authorisedOther: 8 }, // about 66%, a school-refusal pattern
]

// Today's register, partly taken: the morning for everyone, with one absence nobody has heard about yet.
export const todaysMorning = [
  { pupilId: pupils[0].id, code: "present", note: null },
  { pupilId: pupils[1].id, code: "late", note: null },
  { pupilId: pupils[2].id, code: "present", note: null },
  { pupilId: pupils[3].id, code: "no_reason", note: "Parent has not been in touch yet. This is fictional text." },
]

export const ATTENDANCE_SEED_WEEKDAYS_BACK = 70
