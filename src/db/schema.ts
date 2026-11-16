import { relations, sql } from "drizzle-orm"
import { bigint, boolean, check, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

// Tables from user to rateLimit are owned by Better Auth. Keep their column names as they are.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // "parent" or "staff". What a staff member may do comes from `permissions`.
  role: text("role").notNull().default("parent"),
  permissions: text("permissions").array().notNull().default([]),
  // Set when the school hands out a temporary password, cleared once the person picks their own.
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: bigint("count", { mode: "number" }).notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
})

export const child = pgTable("child", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  yearGroup: text("year_group").notNull(),
  dateOfBirth: date("date_of_birth"),
  admissionDate: date("admission_date"),
  leavingDate: date("leaving_date"),
  // Informational. Every member of staff can see every pupil.
  keyWorkerId: text("key_worker_id").references(() => user.id, { onDelete: "set null" }),
  ehcpStatus: text("ehcp_status"),
  localAuthority: text("local_authority"),
  ehcpReviewDue: date("ehcp_review_due"),
  // Leavers are archived, not deleted, so their records are kept.
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// People the school may need to contact about a pupil. Separate from parent logins, though one can be linked to the other.
export const pupilContact = pgTable(
  "pupil_contact",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(),
    phone: text("phone"),
    email: text("email"),
    parentalResponsibility: boolean("parental_responsibility").notNull().default(false),
    emergencyContact: boolean("emergency_contact").notNull().default(false),
    authorisedToCollect: boolean("authorised_to_collect").notNull().default(false),
    notes: text("notes"),
    linkedUserId: text("linked_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("pupil_contact_child_id_idx").on(table.childId)],
)

// Who viewed or changed what. Kept even after the person or pupil is deleted, so it holds a name snapshot and no foreign key to the pupil.
export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at").notNull().defaultNow(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    subject: text("subject").notNull(),
    subjectId: text("subject_id"),
    childId: uuid("child_id"),
    summary: text("summary").notNull(),
  },
  (table) => [index("audit_event_at_idx").on(table.at), index("audit_event_child_id_at_idx").on(table.childId, table.at), index("audit_event_user_id_at_idx").on(table.userId, table.at)],
)

// A parent or carer who may see a child.
export const guardianship = pgTable(
  "guardianship",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    relationship: text("relationship"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.childId] }), index("guardianship_child_id_idx").on(table.childId)],
)

// What a pupil did on a school day. Kept generic until the school confirms what to capture.
export const dayReport = pgTable(
  "day_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    // Cleared when the author's login is deleted, so their reports stay on the pupil's record.
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    reportDate: date("report_date").notNull(),
    // Both optional: a report can cover the whole day and no particular subject.
    session: text("session"),
    subject: text("subject"),
    visibleToParents: boolean("visible_to_parents").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("day_report_child_id_report_date_idx").on(table.childId, table.reportDate),
    check("day_report_session_check", sql`${table.session} is null or ${table.session} in ('morning', 'afternoon', 'all_day')`),
  ],
)

// A write-up of something that happened. Staff only, except the summary written for parents once it has been shared.
export const incident = pgTable(
  "incident",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    // Cleared when the author's login is deleted, so the record stays.
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    occurredOn: date("occurred_on").notNull(),
    // UK local time as HH:MM.
    occurredTime: text("occurred_time").notNull(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    location: text("location"),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    antecedent: text("antecedent"),
    behaviour: text("behaviour"),
    response: text("response"),
    outcome: text("outcome"),
    injury: text("injury"),
    firstAid: text("first_aid"),
    interventionTechnique: text("intervention_technique"),
    interventionMinutes: integer("intervention_minutes"),
    interventionStaff: text("intervention_staff"),
    interventionDebrief: text("intervention_debrief"),
    parentsInformedOn: date("parents_informed_on"),
    parentsInformedBy: text("parents_informed_by"),
    parentsInformedHow: text("parents_informed_how"),
    status: text("status").notNull().default("open"),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    shareWithParents: boolean("share_with_parents").notNull().default(false),
    parentSummary: text("parent_summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("incident_child_id_occurred_on_idx").on(table.childId, table.occurredOn),
    index("incident_status_idx").on(table.status),
    check("incident_type_check", sql`${table.type} in ('behaviour', 'accident_injury', 'physical_intervention', 'bullying', 'other')`),
    check("incident_severity_check", sql`${table.severity} in ('low', 'medium', 'high')`),
    check("incident_status_check", sql`${table.status} in ('open', 'under_review', 'closed')`),
    check("incident_intervention_minutes_check", sql`${table.interventionMinutes} is null or ${table.interventionMinutes} >= 0`),
  ],
)

// Other pupils who were involved or saw it. Never shown to parents.
export const incidentPupil = pgTable(
  "incident_pupil",
  {
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incident.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.incidentId, table.childId] }),
    index("incident_pupil_child_id_idx").on(table.childId),
    check("incident_pupil_role_check", sql`${table.role} in ('involved', 'witness')`),
  ],
)

// Conditions, allergies and dietary needs. An active one marked as an alert is shown to every member of staff.
export const medicalCondition = pgTable(
  "medical_condition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    severity: text("severity").notNull(),
    signs: text("signs"),
    actionPlan: text("action_plan"),
    alert: boolean("alert").notNull().default(false),
    active: boolean("active").notNull().default(true),
    visibleToParents: boolean("visible_to_parents").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("medical_condition_child_id_idx").on(table.childId),
    check("medical_condition_kind_check", sql`${table.kind} in ('condition', 'allergy', 'dietary', 'other')`),
    check("medical_condition_severity_check", sql`${table.severity} in ('mild', 'moderate', 'severe')`),
  ],
)

export const medication = pgTable(
  "medication",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose").notNull(),
    route: text("route").notNull(),
    frequency: text("frequency"),
    // UK clock times as HH:MM. Empty for medication given only when needed.
    scheduledTimes: text("scheduled_times").array().notNull().default([]),
    asRequired: boolean("as_required").notNull().default(false),
    maxDailyDoses: integer("max_daily_doses"),
    prescriber: text("prescriber"),
    startsOn: date("starts_on"),
    expiresOn: date("expires_on"),
    storage: text("storage"),
    // The date the parents agreed to the school giving it. Nothing can be given without one.
    consentOn: date("consent_on"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("medication_child_id_idx").on(table.childId),
    check("medication_route_check", sql`${table.route} in ('oral', 'inhaled', 'topical', 'injection', 'eye_drops', 'other')`),
    check("medication_max_daily_doses_check", sql`${table.maxDailyDoses} is null or ${table.maxDailyDoses} > 0`),
  ],
)

// Append only. A mistake is voided with a reason, never edited or deleted.
export const medicationLog = pgTable(
  "medication_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medication.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    occurredOn: date("occurred_on").notNull(),
    // UK clock time the dose was given, or the outcome was recorded.
    occurredTime: text("occurred_time").notNull(),
    // The scheduled time this entry answers. Null for as-required doses.
    scheduledFor: text("scheduled_for"),
    outcome: text("outcome").notNull(),
    dose: text("dose"),
    givenBy: text("given_by").references(() => user.id, { onDelete: "set null" }),
    // Kept as a snapshot, so the record still names people whose logins are later deleted.
    givenByName: text("given_by_name").notNull(),
    witnessedBy: text("witnessed_by").references(() => user.id, { onDelete: "set null" }),
    witnessedByName: text("witnessed_by_name"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    voidedAt: timestamp("voided_at"),
    voidedBy: text("voided_by").references(() => user.id, { onDelete: "set null" }),
    voidedByName: text("voided_by_name"),
    voidReason: text("void_reason"),
  },
  (table) => [
    index("medication_log_medication_id_occurred_on_idx").on(table.medicationId, table.occurredOn),
    index("medication_log_child_id_occurred_on_idx").on(table.childId, table.occurredOn),
    // One live entry per scheduled dose per day, even if two people record it at once.
    uniqueIndex("medication_log_scheduled_dose_idx")
      .on(table.medicationId, table.occurredOn, table.scheduledFor)
      .where(sql`${table.scheduledFor} is not null and ${table.voidedAt} is null`),
    check("medication_log_outcome_check", sql`${table.outcome} in ('given', 'refused', 'missed', 'not_needed')`),
    check("medication_log_void_check", sql`(${table.voidedAt} is null) = (${table.voidReason} is null)`),
  ],
)

// The file itself lives in the private Blob store. Downloads always go through /portal/files/[id].
// A file belongs to one record. Later record types add their own nullable key here.
export const recordFile = pgTable(
  "record_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    dayReportId: uuid("day_report_id").references(() => dayReport.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").references(() => incident.id, { onDelete: "cascade" }),
    medicalConditionId: uuid("medical_condition_id").references(() => medicalCondition.id, { onDelete: "cascade" }),
    pathname: text("pathname").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("record_file_child_id_idx").on(table.childId),
    index("record_file_day_report_id_idx").on(table.dayReportId),
    index("record_file_incident_id_idx").on(table.incidentId),
    index("record_file_medical_condition_id_idx").on(table.medicalConditionId),
    check("record_file_one_owner_check", sql`num_nonnulls(${table.dayReportId}, ${table.incidentId}, ${table.medicalConditionId}) = 1`),
  ],
)

// One row per pupil per session. Closed days are marks too, with the "closed" code.
export const attendanceMark = pgTable(
  "attendance_mark",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    markDate: date("mark_date").notNull(),
    session: text("session").notNull(),
    code: text("code").notNull(),
    note: text("note"),
    // Cleared if the person's login is deleted, so the register stays complete.
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.childId, table.markDate, table.session] }),
    index("attendance_mark_date_idx").on(table.markDate),
    check("attendance_mark_session_check", sql`${table.session} in ('am', 'pm')`),
  ],
)

export const childRelations = relations(child, ({ many }) => ({
  guardianships: many(guardianship),
  dayReports: many(dayReport),
}))

export const guardianshipRelations = relations(guardianship, ({ one }) => ({
  user: one(user, { fields: [guardianship.userId], references: [user.id] }),
  child: one(child, { fields: [guardianship.childId], references: [child.id] }),
}))

export const dayReportRelations = relations(dayReport, ({ one }) => ({
  child: one(child, { fields: [dayReport.childId], references: [child.id] }),
  author: one(user, { fields: [dayReport.authorId], references: [user.id] }),
}))
