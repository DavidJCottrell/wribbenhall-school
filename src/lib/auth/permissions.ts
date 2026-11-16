// The single place that says what a staff member can be allowed to do.
// Kept free of server-only code so the admin screens can use the same catalogue.

export const permissionGroups = [
  { id: "people", label: "People and system" },
  { id: "attendance", label: "Attendance" },
  { id: "reports", label: "Daily reports" },
  { id: "incidents", label: "Incidents" },
  { id: "medical", label: "Medical" },
] as const

export type PermissionGroupId = (typeof permissionGroups)[number]["id"]

type PermissionDefinition = {
  group: PermissionGroupId
  label: string
  description: string
  // Permissions that are always included with this one, so the stored list never has a gap.
  includes?: readonly string[]
}

export const PERMISSIONS = {
  "users.manage": {
    group: "people",
    label: "Manage logins and permissions",
    description: "Create, edit, disable and delete logins, reset passwords, and change what each person can do.",
  },
  "pupils.manage": {
    group: "people",
    label: "Manage pupils",
    description: "Add, edit, archive and delete pupils. Manage their contacts, parent links and key worker.",
  },
  "audit.view": {
    group: "people",
    label: "View the audit log",
    description: "See who viewed or changed records.",
  },
  "attendance.record": {
    group: "attendance",
    label: "Take the register",
    description: "Record attendance for today and the last few days.",
  },
  "attendance.manage": {
    group: "attendance",
    label: "Manage attendance",
    description: "Edit any date, close school days and correct past marks.",
    includes: ["attendance.record"],
  },
  "reports.write": {
    group: "reports",
    label: "Write daily reports",
    description: "Add daily reports, and edit or delete their own.",
  },
  "reports.manage": {
    group: "reports",
    label: "Manage all daily reports",
    description: "Edit or delete anyone's daily reports.",
    includes: ["reports.write"],
  },
  "incidents.view": {
    group: "incidents",
    label: "View incident records",
    description: "See every incident record.",
  },
  "incidents.record": {
    group: "incidents",
    label: "Record incidents",
    description: "Write up incidents, and edit their own until reviewed.",
    includes: ["incidents.view"],
  },
  "incidents.review": {
    group: "incidents",
    label: "Review incidents",
    description: "Edit any incident, sign it off, share a summary with parents, and delete incidents.",
    includes: ["incidents.record", "incidents.view"],
  },
  "medical.view": {
    group: "medical",
    label: "View medical records",
    description: "See conditions, care plans and medication.",
  },
  "medical.record": {
    group: "medical",
    label: "Give and log medication",
    description: "Record that medication was given, refused or missed.",
    includes: ["medical.view"],
  },
  "medical.manage": {
    group: "medical",
    label: "Manage medical records",
    description: "Edit conditions, medication, consent and care plans.",
    includes: ["medical.view"],
  },
} as const satisfies Record<string, PermissionDefinition>

export type Permission = keyof typeof PERMISSIONS

export const allPermissions = Object.keys(PERMISSIONS) as Permission[]

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && Object.hasOwn(PERMISSIONS, value)
}

export function permissionsInGroup(group: PermissionGroupId): Permission[] {
  return allPermissions.filter((permission) => PERMISSIONS[permission].group === group)
}

function includedBy(permission: Permission): readonly Permission[] {
  const definition: PermissionDefinition = PERMISSIONS[permission]
  return (definition.includes ?? []).filter(isPermission)
}

// Anything unknown is dropped, included permissions are added, and the result is in catalogue order.
export function normalizePermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return []

  const granted = new Set<Permission>()
  const visit = (permission: Permission) => {
    if (granted.has(permission)) return
    granted.add(permission)
    includedBy(permission).forEach(visit)
  }
  values.filter(isPermission).forEach(visit)

  return allPermissions.filter((permission) => granted.has(permission))
}

// What else would be switched off if this one were removed.
export function permissionsThatDependOn(permission: Permission): Permission[] {
  return allPermissions.filter((candidate) => candidate !== permission && includedBy(candidate).includes(permission))
}

export type PermissionPreset = {
  id: string
  label: string
  description: string
  permissions: readonly Permission[]
}

// Starting points only. They tick boxes and can be changed afterwards.
export const PERMISSION_PRESETS: readonly PermissionPreset[] = [
  {
    id: "head-teacher",
    label: "Head teacher",
    description: "Everything, including managing logins.",
    permissions: allPermissions,
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Register, daily reports, incidents and medical records (view only).",
    permissions: normalizePermissions(["attendance.record", "reports.write", "incidents.record", "medical.view"]),
  },
  {
    id: "learning-support",
    label: "Learning support assistant",
    description: "Register, daily reports and recording incidents.",
    permissions: normalizePermissions(["attendance.record", "reports.write", "incidents.record"]),
  },
  {
    id: "office",
    label: "Office",
    description: "Pupils, the register and all daily reports.",
    permissions: normalizePermissions(["pupils.manage", "attendance.manage", "reports.manage"]),
  },
]

export type UserKind = "parent" | "staff"

export const userKinds: readonly UserKind[] = ["parent", "staff"]

export function isUserKind(value: unknown): value is UserKind {
  return typeof value === "string" && (userKinds as readonly string[]).includes(value)
}

export type Actor = {
  kind: UserKind
  permissions: readonly Permission[]
}

// Parents never hold permissions. Their access comes from being linked to a pupil.
export function can(actor: Actor, permission: Permission): boolean {
  return actor.kind === "staff" && actor.permissions.includes(permission)
}

export function canAny(actor: Actor, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(actor, permission))
}

export function isStaff(actor: Actor): boolean {
  return actor.kind === "staff"
}

export function isParent(actor: Actor): boolean {
  return actor.kind === "parent"
}
