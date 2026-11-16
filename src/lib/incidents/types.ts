// Incident vocabulary. The values are stored in the database, so changing one needs a migration.

export const INCIDENT_TYPES = {
  behaviour: "Behaviour",
  accident_injury: "Accident or injury",
  physical_intervention: "Physical intervention",
  bullying: "Bullying",
  other: "Other",
} as const

export type IncidentType = keyof typeof INCIDENT_TYPES
export const incidentTypes = Object.keys(INCIDENT_TYPES) as IncidentType[]

export const SEVERITIES = { low: "Low", medium: "Medium", high: "High" } as const
export type Severity = keyof typeof SEVERITIES
export const severities = Object.keys(SEVERITIES) as Severity[]

export const INCIDENT_STATUSES = { open: "Open", under_review: "Under review", closed: "Closed" } as const
export type IncidentStatus = keyof typeof INCIDENT_STATUSES
export const incidentStatuses = Object.keys(INCIDENT_STATUSES) as IncidentStatus[]

export const INVOLVEMENT_ROLES = { involved: "Involved", witness: "Witnessed" } as const
export type InvolvementRole = keyof typeof INVOLVEMENT_ROLES
export const involvementRoles = Object.keys(INVOLVEMENT_ROLES) as InvolvementRole[]

export const INFORMED_HOW = { phone: "Phone call", in_person: "In person", email: "Email", message: "Message", letter: "Letter" } as const
export type InformedHow = keyof typeof INFORMED_HOW
export const informedHowOptions = Object.keys(INFORMED_HOW) as InformedHow[]

export const isIncidentType = (value: unknown): value is IncidentType => typeof value === "string" && Object.hasOwn(INCIDENT_TYPES, value)
export const isSeverity = (value: unknown): value is Severity => typeof value === "string" && Object.hasOwn(SEVERITIES, value)
export const isIncidentStatus = (value: unknown): value is IncidentStatus => typeof value === "string" && Object.hasOwn(INCIDENT_STATUSES, value)
export const isInvolvementRole = (value: unknown): value is InvolvementRole => typeof value === "string" && Object.hasOwn(INVOLVEMENT_ROLES, value)
export const isInformedHow = (value: unknown): value is InformedHow => typeof value === "string" && Object.hasOwn(INFORMED_HOW, value)
