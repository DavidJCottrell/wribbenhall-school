import { describe, expect, it } from "vitest"

import {
  PERMISSIONS,
  PERMISSION_PRESETS,
  allPermissions,
  can,
  canAny,
  isPermission,
  normalizePermissions,
  permissionsThatDependOn,
  type Actor,
  type Permission,
} from "./permissions"

const staffWith = (...permissions: Permission[]): Actor => ({ kind: "staff", permissions: normalizePermissions(permissions) })

describe("can", () => {
  it("allows only what a staff member holds", () => {
    const actor = staffWith("attendance.record")
    expect(can(actor, "attendance.record")).toBe(true)
    expect(can(actor, "attendance.manage")).toBe(false)
    expect(can(actor, "users.manage")).toBe(false)
  })

  it("never allows a parent anything, even if permissions were somehow attached", () => {
    const parent: Actor = { kind: "parent", permissions: allPermissions }
    for (const permission of allPermissions) expect(can(parent, permission)).toBe(false)
  })

  it("treats a staff member with no permissions as having none", () => {
    for (const permission of allPermissions) expect(can(staffWith(), permission)).toBe(false)
  })

  it("canAny is true if at least one matches", () => {
    const actor = staffWith("reports.write")
    expect(canAny(actor, ["incidents.view", "reports.write"])).toBe(true)
    expect(canAny(actor, ["incidents.view", "medical.view"])).toBe(false)
  })
})

describe("normalizePermissions", () => {
  it("drops unknown and non-string values and removes duplicates", () => {
    expect(normalizePermissions(["reports.write", "reports.write", "nope", 4, null])).toEqual(["reports.write"])
  })

  it("returns an empty list for anything that isn't a list", () => {
    expect(normalizePermissions(undefined)).toEqual([])
    expect(normalizePermissions("reports.write")).toEqual([])
    expect(normalizePermissions({})).toEqual([])
  })

  it("adds the permissions that a higher one includes", () => {
    expect(normalizePermissions(["incidents.review"])).toEqual(["incidents.view", "incidents.record", "incidents.review"])
    expect(normalizePermissions(["medical.record"])).toEqual(["medical.view", "medical.record"])
    expect(normalizePermissions(["attendance.manage"])).toEqual(["attendance.record", "attendance.manage"])
  })

  it("returns catalogue order whatever order it was given", () => {
    expect(normalizePermissions(["medical.view", "users.manage"])).toEqual(["users.manage", "medical.view"])
  })

  it("is idempotent", () => {
    const once = normalizePermissions(["incidents.review", "medical.manage"])
    expect(normalizePermissions(once)).toEqual(once)
  })
})

describe("catalogue", () => {
  it("has a label, description and group for every permission", () => {
    for (const permission of allPermissions) {
      const definition = PERMISSIONS[permission]
      expect(definition.label.length).toBeGreaterThan(0)
      expect(definition.description.length).toBeGreaterThan(0)
    }
  })

  it("only includes permissions that exist, and never itself", () => {
    for (const permission of allPermissions) {
      const included: readonly string[] = (PERMISSIONS[permission] as { includes?: readonly string[] }).includes ?? []
      for (const other of included) {
        expect(isPermission(other)).toBe(true)
        expect(other).not.toBe(permission)
      }
    }
  })

  it("lists what would also be removed when a permission is taken away", () => {
    expect(permissionsThatDependOn("incidents.view")).toEqual(["incidents.record", "incidents.review"])
    expect(permissionsThatDependOn("users.manage")).toEqual([])
  })
})

describe("presets", () => {
  it("only contain real permissions and are already complete", () => {
    for (const preset of PERMISSION_PRESETS) {
      expect(normalizePermissions(preset.permissions)).toEqual([...preset.permissions])
    }
  })

  it("makes the head teacher both staff and administrator", () => {
    const head = PERMISSION_PRESETS.find((preset) => preset.id === "head-teacher")
    expect(head?.permissions).toEqual(allPermissions)
    expect(head?.permissions).toContain("users.manage")
    expect(head?.permissions).toContain("attendance.record")
  })

  it("does not give ordinary staff presets the power to manage logins", () => {
    for (const preset of PERMISSION_PRESETS.filter((candidate) => candidate.id !== "head-teacher")) {
      expect(preset.permissions).not.toContain("users.manage")
    }
  })
})
