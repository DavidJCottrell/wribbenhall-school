// Fictional data for development and preview databases. Never run this against production.
import { eq } from "drizzle-orm"

import { getDb } from "../../src/db"
import { child, childUpdate, guardianship, staffAssignment, user } from "../../src/db/schema"
import { getAuth } from "../../src/lib/auth/auth"

if (process.env.ALLOW_DEV_SEED !== "true") {
  throw new Error("Refusing to seed. Set ALLOW_DEV_SEED=true, and only for a development or preview database.")
}

const DEV_PASSWORD = "dev-password-12345"

const db = getDb()
const auth = getAuth()

async function ensureUser(email: string, name: string, role: "parent" | "staff") {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
  if (existing) return existing.id

  // The admin plugin only types "user" and "admin" roles, so staff are promoted directly.
  const created = await auth.api.createUser({ body: { email, name, password: DEV_PASSWORD } })
  await db.update(user).set({ role }).where(eq(user.id, created.user.id))
  return created.user.id
}

const parentId = await ensureUser("parent@example.test", "Pat Example", "parent")
const otherParentId = await ensureUser("other-parent@example.test", "Sam Sample", "parent")
const staffId = await ensureUser("staff@example.test", "Alex Teacher", "staff")

const existingChildren = await db.select({ id: child.id }).from(child)
if (existingChildren.length === 0) {
  const [river, oak, ash] = await db
    .insert(child)
    .values([
      { firstName: "River", lastName: "Example", yearGroup: "Year 4" },
      { firstName: "Oak", lastName: "Example", yearGroup: "Year 7" },
      { firstName: "Ash", lastName: "Sample", yearGroup: "Year 2" },
    ])
    .returning({ id: child.id })

  await db.insert(guardianship).values([
    { userId: parentId, childId: river.id, relationship: "Parent" },
    { userId: parentId, childId: oak.id, relationship: "Parent" },
    { userId: otherParentId, childId: ash.id, relationship: "Carer" },
  ])
  await db.insert(staffAssignment).values([
    { userId: staffId, childId: river.id },
    { userId: staffId, childId: ash.id },
  ])
  await db.insert(childUpdate).values({
    childId: river.id,
    authorId: staffId,
    title: "Sample update",
    body: "This is fictional text for development.",
    occurredOn: "2026-11-12",
  })
}

console.log(`Seeded. Fictional accounts: parent@example.test, other-parent@example.test, staff@example.test (password ${DEV_PASSWORD})`)
