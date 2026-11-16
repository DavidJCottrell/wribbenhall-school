import { describe, expect, it } from "vitest"

import { normalizePermissions, type Permission } from "@/lib/auth/permissions"

import { allowedOutcomes, asRequiredAllowance, canAdminister, canVoidEntry, expiryState, scheduledDoses } from "./rules"
import { isClockTime, isDoseOutcome } from "./types"

const person = (id: string, permissions: Permission[], kind: "staff" | "parent" = "staff") => ({ id, kind, permissions: normalizePermissions(permissions) })

describe("expiry", () => {
  it("says when medication is out of date or nearly", () => {
    expect(expiryState(null, "2026-11-16")).toBe("none")
    expect(expiryState("2026-11-15", "2026-11-16")).toBe("expired")
    expect(expiryState("2026-11-16", "2026-11-16")).toBe("soon")
    expect(expiryState("2026-12-16", "2026-11-16")).toBe("soon")
    expect(expiryState("2026-12-17", "2026-11-16")).toBe("ok")
  })
})

describe("whether medication may be given", () => {
  const ready = { active: true, startsOn: "2026-11-01", expiresOn: "2027-06-01", consentOn: "2026-10-30" }

  it("allows it when active, consented, started and in date", () => {
    expect(canAdminister(ready, "2026-11-16")).toEqual({ ok: true })
  })

  it("refuses without consent, when inactive, not started or expired", () => {
    expect(canAdminister({ ...ready, consentOn: null }, "2026-11-16").ok).toBe(false)
    expect(canAdminister({ ...ready, active: false }, "2026-11-16").ok).toBe(false)
    expect(canAdminister({ ...ready, startsOn: "2026-11-20" }, "2026-11-16").ok).toBe(false)
    expect(canAdminister({ ...ready, expiresOn: "2026-11-15" }, "2026-11-16").ok).toBe(false)
  })

  it("gives a reason a person can act on", () => {
    const refused = canAdminister({ ...ready, consentOn: null }, "2026-11-16")
    expect(refused.ok === false && refused.reason).toMatch(/consent/i)
  })
})

describe("today's scheduled doses", () => {
  it("is upcoming, due, then overdue as the time passes", () => {
    expect(scheduledDoses(["12:30"], [], "10:00")[0].status).toBe("upcoming")
    expect(scheduledDoses(["12:30"], [], "12:00")[0].status).toBe("due")
    expect(scheduledDoses(["12:30"], [], "13:30")[0].status).toBe("due")
    expect(scheduledDoses(["12:30"], [], "13:31")[0].status).toBe("overdue")
  })

  it("shows what happened once something is recorded, whatever the time", () => {
    expect(scheduledDoses(["08:30", "12:30"], [{ scheduledFor: "08:30", outcome: "refused" }], "16:00")).toEqual([
      { time: "08:30", status: "refused" },
      { time: "12:30", status: "overdue" },
    ])
  })

  it("lists times in order", () => {
    expect(scheduledDoses(["12:30", "08:00"], [], "07:00").map((dose) => dose.time)).toEqual(["08:00", "12:30"])
  })
})

describe("as-required limits", () => {
  it("counts down to the daily maximum", () => {
    expect(asRequiredAllowance(2, 1)).toEqual({ reached: false, remaining: 1 })
    expect(asRequiredAllowance(2, 2)).toEqual({ reached: true, remaining: 0 })
  })

  it("has no limit when none is set", () => {
    expect(asRequiredAllowance(null, 9)).toEqual({ reached: false, remaining: null })
  })
})

describe("outcomes", () => {
  it("lets as-required medication be given or refused only", () => {
    expect(allowedOutcomes(true)).toEqual(["given", "refused"])
    expect(allowedOutcomes(false)).toContain("missed")
  })
})

describe("voiding an entry", () => {
  const entry = { givenBy: "a", voidedAt: null }

  it("lets someone void their own entry, and a manager void anyone's", () => {
    expect(canVoidEntry(person("a", ["medical.record"]), entry)).toBe(true)
    expect(canVoidEntry(person("b", ["medical.record"]), entry)).toBe(false)
    expect(canVoidEntry(person("b", ["medical.manage"]), entry)).toBe(true)
  })

  it("never lets view-only staff or parents void, or anyone void twice", () => {
    expect(canVoidEntry(person("a", ["medical.view"]), entry)).toBe(false)
    expect(canVoidEntry(person("a", ["medical.manage"], "parent"), entry)).toBe(false)
    expect(canVoidEntry(person("b", ["medical.manage"]), { givenBy: "a", voidedAt: new Date() })).toBe(false)
  })
})

describe("vocabulary guards", () => {
  it("accepts only known values", () => {
    expect(isDoseOutcome("given")).toBe(true)
    expect(isDoseOutcome("toString")).toBe(false)
    expect(isClockTime("08:30")).toBe(true)
    expect(isClockTime("8:30")).toBe(false)
    expect(isClockTime("24:00")).toBe(false)
  })
})
