import { relations } from "drizzle-orm"
import { bigint, boolean, date, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Tables from user to rateLimit are owned by Better Auth. Keep their column names as they are.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("parent"),
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
  yearGroup: text("year_group").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

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

// A member of staff who may see and add to a child's record.
export const staffAssignment = pgTable(
  "staff_assignment",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.childId] }), index("staff_assignment_child_id_idx").on(table.childId)],
)

export const childUpdate = pgTable(
  "child_update",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    occurredOn: date("occurred_on").notNull(),
    visibleToParents: boolean("visible_to_parents").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("child_update_child_id_occurred_on_idx").on(table.childId, table.occurredOn)],
)

export const childRelations = relations(child, ({ many }) => ({
  guardianships: many(guardianship),
  staffAssignments: many(staffAssignment),
  updates: many(childUpdate),
}))

export const guardianshipRelations = relations(guardianship, ({ one }) => ({
  user: one(user, { fields: [guardianship.userId], references: [user.id] }),
  child: one(child, { fields: [guardianship.childId], references: [child.id] }),
}))

export const staffAssignmentRelations = relations(staffAssignment, ({ one }) => ({
  user: one(user, { fields: [staffAssignment.userId], references: [user.id] }),
  child: one(child, { fields: [staffAssignment.childId], references: [child.id] }),
}))

export const childUpdateRelations = relations(childUpdate, ({ one }) => ({
  child: one(child, { fields: [childUpdate.childId], references: [child.id] }),
  author: one(user, { fields: [childUpdate.authorId], references: [user.id] }),
}))
