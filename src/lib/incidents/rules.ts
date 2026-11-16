import { can } from "@/lib/auth/permissions"
import type { CurrentUser } from "@/lib/auth/session"

import type { IncidentStatus } from "./types"

type Editable = { createdBy: string | null; status: IncidentStatus }

// People who record can fix their own write-up until someone has picked it up. Reviewers can change anything.
export function canEditIncident(user: Pick<CurrentUser, "id" | "kind" | "permissions">, incident: Editable) {
  if (can(user, "incidents.review")) return true
  return can(user, "incidents.record") && incident.createdBy === user.id && incident.status === "open"
}

// A parent only ever sees what staff wrote for them, so sharing needs that text.
export function canShareWithParents(parentSummary: string | null | undefined) {
  return Boolean(parentSummary?.trim())
}

// Details that only mean something for one kind of incident are dropped for the others, so they can't linger after a type change.
export function keepsInterventionDetails(type: string) {
  return type === "physical_intervention"
}

export function keepsInjuryDetails(type: string) {
  return type === "accident_injury" || type === "physical_intervention"
}
