import { readFileSync } from "node:fs"

import { verifyPassword } from "better-auth/crypto"
import { describe, expect, it } from "vitest"

import { allPermissions, normalizePermissions } from "../../src/lib/auth/permissions"
import { appTables } from "./app-tables.mjs"
import { buildResetSql } from "./build-reset-sql.mjs"
import { DEV_PASSWORD, DEV_PASSWORD_HASH, TEST_EMAIL_DOMAIN, contacts, guardianships, pupils, reports, users } from "./fixtures.mjs"

const userById = new Map(users.map((fixture) => [fixture.id, fixture]))
const pupilIds = new Set(pupils.map((pupil) => pupil.id))

describe("fixtures", () => {
  it("has a password hash that still verifies", async () => {
    expect(await verifyPassword({ hash: DEV_PASSWORD_HASH, password: DEV_PASSWORD })).toBe(true)
  })

  it("uses only test email addresses, each once", () => {
    const emails = users.map((fixture) => fixture.email)
    expect(new Set(emails).size).toBe(emails.length)
    for (const email of emails) expect(email.endsWith(TEST_EMAIL_DOMAIN)).toBe(true)
  })

  it("gives parents no permissions and staff a complete permission list", () => {
    for (const fixture of users) {
      if (fixture.kind === "parent") expect(fixture.permissions).toEqual([])
      else expect(normalizePermissions(fixture.permissions)).toEqual(fixture.permissions)
    }
  })

  it("includes a head teacher with every permission, and a staff member with none", () => {
    expect(users.some((fixture) => fixture.kind === "staff" && fixture.permissions.length === allPermissions.length)).toBe(true)
    expect(users.some((fixture) => fixture.kind === "staff" && fixture.permissions.length === 0)).toBe(true)
  })

  it("only points at things that exist", () => {
    for (const pupil of pupils) if (pupil.keyWorkerId) expect(userById.get(pupil.keyWorkerId)?.kind).toBe("staff")
    for (const contact of contacts) {
      expect(pupilIds.has(contact.pupilId)).toBe(true)
      if (contact.linkedUserId) expect(userById.get(contact.linkedUserId)?.kind).toBe("parent")
      if (contact.emergencyContact) expect(contact.phone).not.toBeNull()
    }
    for (const link of guardianships) {
      expect(userById.get(link.userId)?.kind).toBe("parent")
      expect(pupilIds.has(link.pupilId)).toBe(true)
    }
    for (const report of reports) {
      expect(pupilIds.has(report.pupilId)).toBe(true)
      expect(userById.get(report.authorId)?.kind).toBe("staff")
    }
  })
})

describe("reset SQL", () => {
  it("is the committed file, so it can't go stale. Run npm run db:generate-reset-sql if this fails", () => {
    expect(readFileSync(new URL("./reset-preview.sql", import.meta.url), "utf8")).toBe(buildResetSql())
  })

  it("wipes every table in the schema", () => {
    const sql = buildResetSql()
    for (const table of appTables) expect(sql).toContain(`"${table}"`)
  })
})
