// Creates the head teacher's login: staff with every permission. Run it yourself so the password never leaves your machine:
//   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD=... npm run db:create-admin
import { eq } from "drizzle-orm"

import { getDb } from "../../src/db"
import { user } from "../../src/db/schema"
import { getAuth } from "../../src/lib/auth/auth"
import { allPermissions } from "../../src/lib/auth/permissions"

const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env

if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
  throw new Error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD")
}

const created = await getAuth().api.createUser({ body: { email: ADMIN_EMAIL.toLowerCase(), name: ADMIN_NAME, password: ADMIN_PASSWORD } })
await getDb().update(user).set({ role: "staff", permissions: [...allPermissions], mustChangePassword: false }).where(eq(user.id, created.user.id))
console.log(`Created ${ADMIN_EMAIL} as staff with every permission`)
