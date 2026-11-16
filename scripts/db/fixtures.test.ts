import { readFileSync } from "node:fs"

import { verifyPassword } from "better-auth/crypto"
import { describe, expect, it } from "vitest"

import { canAdminister } from "../../src/lib/medical/rules"
import { isAttendanceCode } from "../../src/lib/attendance/codes"
import { allPermissions, normalizePermissions } from "../../src/lib/auth/permissions"
import { appTables } from "./app-tables.mjs"
import { buildResetSql } from "./build-reset-sql.mjs"
import { DEV_PASSWORD, DEV_PASSWORD_HASH, TEST_EMAIL_DOMAIN, attendanceProfiles, contacts, todaysMorning, conditions, guardianships, incidents, medicationLog, medications, pupils, reports, users } from "./fixtures.mjs"

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

describe("incident fixtures", () => {
  it("point at real pupils and staff, and never list the pupil as involved in their own incident", () => {
    for (const incident of incidents) {
      expect(pupilIds.has(incident.pupilId)).toBe(true)
      expect(userById.get(incident.createdBy)?.kind).toBe("staff")
      if (incident.reviewedBy) expect(userById.get(incident.reviewedBy)?.kind).toBe("staff")
      for (const other of incident.involved) {
        expect(pupilIds.has(other.pupilId)).toBe(true)
        expect(other.pupilId).not.toBe(incident.pupilId)
      }
    }
  })

  it("only shares an incident that has a summary, and only describes interventions that were physical", () => {
    for (const incident of incidents) {
      if (incident.shareWithParents) expect(incident.parentSummary?.trim()).toBeTruthy()
      expect(incident.intervention !== null).toBe(incident.type === "physical_intervention")
    }
  })
})

describe("medical fixtures", () => {
  const medicationIds = new Set(medications.map((medication) => medication.id))

  it("point at real pupils, and only alert about conditions that are current", () => {
    for (const condition of conditions) {
      expect(pupilIds.has(condition.pupilId)).toBe(true)
      if (condition.alert) expect(condition.active).toBe(true)
    }
  })

  it("give scheduled medication times and as-required medication none", () => {
    for (const medication of medications) {
      expect(pupilIds.has(medication.pupilId)).toBe(true)
      expect(medication.scheduledTimes.length > 0).toBe(!medication.asRequired)
      for (const time of medication.scheduledTimes) expect(time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
    }
  })

  it("includes medication the school must not give: one without consent and one that has expired", () => {
    const blocked = medications.filter((medication) => {
      const check = canAdminister(
        {
          active: medication.active,
          startsOn: null,
          expiresOn: medication.expiresInDays !== null && medication.expiresInDays < 0 ? "2000-01-01" : null,
          consentOn: medication.consentDaysAgo === null ? null : "2000-01-01",
        },
        "2026-01-01",
      )
      return !check.ok
    })
    expect(blocked.length).toBeGreaterThanOrEqual(2)
  })

  it("has a log that points at real medication and people, with a reason for anything voided", () => {
    for (const dose of medicationLog) {
      expect(medicationIds.has(dose.medicationId)).toBe(true)
      expect(pupilIds.has(dose.pupilId)).toBe(true)
      expect(userById.get(dose.givenBy)?.kind).toBe("staff")
      if (dose.witnessedBy) expect(dose.witnessedBy).not.toBe(dose.givenBy)
      expect(medications.find((medication) => medication.id === dose.medicationId)?.pupilId).toBe(dose.pupilId)
    }
  })
})

describe("attendance fixtures", () => {
  it("has a pattern for every pupil that leaves room for unauthorised absence", () => {
    expect(attendanceProfiles.map((profile) => profile.pupilId).sort()).toEqual([...pupilIds].sort())
    for (const profile of attendanceProfiles) {
      const total = profile.present + profile.late + profile.illness + profile.medical + profile.authorisedOther
      expect(total).toBeLessThanOrEqual(100)
    }
  })

  it("uses real attendance codes for today's morning", () => {
    for (const entry of todaysMorning) {
      expect(pupilIds.has(entry.pupilId)).toBe(true)
      expect(isAttendanceCode(entry.code)).toBe(true)
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
