// Fictional data for development and preview databases. Shared by db:seed and db:reset-preview.
import { eq } from "drizzle-orm"

import { getDb } from "../../src/db"
import { child, childUpdate, guardianship, staffAssignment, user } from "../../src/db/schema"
import { getAuth } from "../../src/lib/auth/auth"

export const DEV_PASSWORD = "dev-password-12345"
const TEST_EMAIL_DOMAIN = "@example.test"

// Stops these scripts touching a database that holds anyone's real login.
export async function assertOnlyTestUsers() {
  const emails = await getDb().select({ email: user.email }).from(user)
  const real = emails.filter(({ email }) => !email.toLowerCase().endsWith(TEST_EMAIL_DOMAIN))
  if (real.length > 0) {
    throw new Error(
      `Refusing to continue: ${real.length} login(s) in this database don't use ${TEST_EMAIL_DOMAIN} addresses, so it may hold real data. ` +
        "Only test databases are allowed. If this is a preview database, delete those logins first.",
    )
  }
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

type Role = "parent" | "staff" | "admin"

async function ensureUser(email: string, name: string, role: Role) {
  const db = getDb()
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
  if (existing) return existing.id

  // The admin plugin only types "user" and "admin" roles, so the role is set directly.
  const created = await getAuth().api.createUser({ body: { email, name, password: DEV_PASSWORD } })
  await db.update(user).set({ role }).where(eq(user.id, created.user.id))
  return created.user.id
}

export const seededAccounts = [
  { email: "admin@example.test", role: "Administrator" },
  { email: "staff@example.test", role: "Staff (River, Ash)" },
  { email: "staff2@example.test", role: "Staff (Oak, Willow, River)" },
  { email: "parent@example.test", role: "Parent (River, Oak)" },
  { email: "other-parent@example.test", role: "Parent (Ash)" },
  { email: "carer@example.test", role: "Carer (Willow)" },
]

export async function seedDevData() {
  const db = getDb()

  await ensureUser("admin@example.test", "Robin Admin", "admin")
  const alex = await ensureUser("staff@example.test", "Alex Teacher", "staff")
  const jo = await ensureUser("staff2@example.test", "Jo Support", "staff")
  const pat = await ensureUser("parent@example.test", "Pat Example", "parent")
  const sam = await ensureUser("other-parent@example.test", "Sam Sample", "parent")
  const chris = await ensureUser("carer@example.test", "Chris Carer", "parent")

  const [existingChild] = await db.select({ id: child.id }).from(child).limit(1)
  if (existingChild) return

  const [river, oak, ash, willow] = await db
    .insert(child)
    .values([
      { firstName: "River", lastName: "Example", yearGroup: "Year 4" },
      { firstName: "Oak", lastName: "Example", yearGroup: "Year 7" },
      { firstName: "Ash", lastName: "Sample", yearGroup: "Year 2" },
      { firstName: "Willow", lastName: "Brook", yearGroup: "Year 10" },
    ])
    .returning({ id: child.id })

  await db.insert(guardianship).values([
    { userId: pat, childId: river.id, relationship: "Parent" },
    { userId: pat, childId: oak.id, relationship: "Parent" },
    { userId: sam, childId: ash.id, relationship: "Carer" },
    { userId: chris, childId: willow.id, relationship: "Grandparent" },
  ])

  await db.insert(staffAssignment).values([
    { userId: alex, childId: river.id },
    { userId: alex, childId: ash.id },
    { userId: jo, childId: oak.id },
    { userId: jo, childId: willow.id },
    { userId: jo, childId: river.id },
  ])

  const note = "This is fictional text for development."
  await db.insert(childUpdate).values([
    { childId: river.id, authorId: alex, title: "Reading together", body: note, occurredOn: daysAgo(1) },
    { childId: river.id, authorId: jo, title: "Staff note: sensory break", body: note, occurredOn: daysAgo(3), visibleToParents: false },
    { childId: river.id, authorId: alex, title: "Swimming session", body: `${note}\nA second line, to check line breaks.`, occurredOn: daysAgo(8) },
    { childId: oak.id, authorId: jo, title: "Art project", body: note, occurredOn: daysAgo(2) },
    { childId: oak.id, authorId: jo, title: "Staff note: lunchtime routine", body: note, occurredOn: daysAgo(6), visibleToParents: false },
    { childId: ash.id, authorId: alex, title: "Garden visit", body: note, occurredOn: daysAgo(4) },
    { childId: willow.id, authorId: jo, title: "Work experience planning", body: note, occurredOn: daysAgo(5) },
  ])
}
