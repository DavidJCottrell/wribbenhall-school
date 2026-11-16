// Creates the first administrator. Run it yourself so the password never leaves your machine:
//   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD=... npm run db:create-admin
import { getAuth } from "../../src/lib/auth/auth"

const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env

if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
  throw new Error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD")
}

await getAuth().api.createUser({
  body: { email: ADMIN_EMAIL, name: ADMIN_NAME, password: ADMIN_PASSWORD, role: "admin" },
})
console.log(`Created administrator ${ADMIN_EMAIL}`)
