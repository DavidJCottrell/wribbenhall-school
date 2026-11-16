import { relations } from "drizzle-orm"
import { bigint, boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"

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

export const childUpdate = pgTable(
  "child_update",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    // Cleared when the author's login is deleted, so their updates stay on the child's record.
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    occurredOn: date("occurred_on").notNull(),
    visibleToParents: boolean("visible_to_parents").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("child_update_child_id_occurred_on_idx").on(table.childId, table.occurredOn)],
)

// The file itself lives in the private Blob store. Downloads always go through /portal/files/[id].
export const childUpdateAttachment = pgTable(
  "child_update_attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    updateId: uuid("update_id")
      .notNull()
      .references(() => childUpdate.id, { onDelete: "cascade" }),
    pathname: text("pathname").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("child_update_attachment_update_id_idx").on(table.updateId)],
)

export const childRelations = relations(child, ({ many }) => ({
  guardianships: many(guardianship),
  updates: many(childUpdate),
}))

export const guardianshipRelations = relations(guardianship, ({ one }) => ({
  user: one(user, { fields: [guardianship.userId], references: [user.id] }),
  child: one(child, { fields: [guardianship.childId], references: [child.id] }),
}))

export const childUpdateRelations = relations(childUpdate, ({ one }) => ({
  child: one(child, { fields: [childUpdate.childId], references: [child.id] }),
  author: one(user, { fields: [childUpdate.authorId], references: [user.id] }),
}))
