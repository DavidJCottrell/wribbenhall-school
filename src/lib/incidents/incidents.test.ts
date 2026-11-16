import { describe, expect, it } from "vitest"

import { normalizePermissions, type Permission } from "@/lib/auth/permissions"

import { canEditIncident, canShareWithParents, keepsInjuryDetails, keepsInterventionDetails } from "./rules"
import { incidentStatuses, incidentTypes, isIncidentStatus, isIncidentType, isSeverity } from "./types"

const person = (id: string, permissions: Permission[], kind: "staff" | "parent" = "staff") => ({ id, kind, permissions: normalizePermissions(permissions) })

describe("who may edit an incident", () => {
  const own = { createdBy: "a", status: "open" } as const

  it("lets a recorder edit their own open incident", () => {
    expect(canEditIncident(person("a", ["incidents.record"]), own)).toBe(true)
  })

  it("stops a recorder editing once it is under review or closed", () => {
    expect(canEditIncident(person("a", ["incidents.record"]), { createdBy: "a", status: "under_review" })).toBe(false)
    expect(canEditIncident(person("a", ["incidents.record"]), { createdBy: "a", status: "closed" })).toBe(false)
  })

  it("stops a recorder editing someone else's incident", () => {
    expect(canEditIncident(person("b", ["incidents.record"]), own)).toBe(false)
  })

  it("lets a reviewer edit anything, including after the author's login is gone", () => {
    expect(canEditIncident(person("b", ["incidents.review"]), { createdBy: null, status: "closed" })).toBe(true)
  })

  it("never lets someone with only view access, or a parent, edit", () => {
    expect(canEditIncident(person("a", ["incidents.view"]), own)).toBe(false)
    expect(canEditIncident(person("a", ["incidents.review"], "parent"), own)).toBe(false)
  })
})

describe("sharing with parents", () => {
  it("needs a summary", () => {
    expect(canShareWithParents("")).toBe(false)
    expect(canShareWithParents("   ")).toBe(false)
    expect(canShareWithParents(null)).toBe(false)
    expect(canShareWithParents("We spoke with River about what happened.")).toBe(true)
  })
})

describe("details that depend on the type", () => {
  it("keeps intervention details only for physical interventions", () => {
    expect(incidentTypes.filter(keepsInterventionDetails)).toEqual(["physical_intervention"])
  })

  it("keeps injury details for injuries and interventions", () => {
    expect(incidentTypes.filter(keepsInjuryDetails)).toEqual(["accident_injury", "physical_intervention"])
  })
})

describe("vocabulary guards", () => {
  it("accepts only known values", () => {
    expect(isIncidentType("bullying")).toBe(true)
    expect(isIncidentType("toString")).toBe(false)
    expect(isSeverity("high")).toBe(true)
    expect(isSeverity("severe")).toBe(false)
    expect(incidentStatuses.every(isIncidentStatus)).toBe(true)
    expect(isIncidentStatus("deleted")).toBe(false)
  })
})
