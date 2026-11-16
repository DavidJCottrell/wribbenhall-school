// Medical vocabulary. The values are stored in the database, so changing one needs a migration.

export const CONDITION_KINDS = { condition: "Condition", allergy: "Allergy", dietary: "Dietary need", other: "Other" } as const
export type ConditionKind = keyof typeof CONDITION_KINDS
export const conditionKinds = Object.keys(CONDITION_KINDS) as ConditionKind[]

export const CONDITION_SEVERITIES = { mild: "Mild", moderate: "Moderate", severe: "Severe" } as const
export type ConditionSeverity = keyof typeof CONDITION_SEVERITIES
export const conditionSeverities = Object.keys(CONDITION_SEVERITIES) as ConditionSeverity[]

export const MEDICATION_ROUTES = {
  oral: "By mouth",
  inhaled: "Inhaled",
  topical: "On the skin",
  injection: "Injection",
  eye_drops: "Eye drops",
  other: "Other",
} as const
export type MedicationRoute = keyof typeof MEDICATION_ROUTES
export const medicationRoutes = Object.keys(MEDICATION_ROUTES) as MedicationRoute[]

export const DOSE_OUTCOMES = { given: "Given", refused: "Refused", missed: "Missed", not_needed: "Not needed" } as const
export type DoseOutcome = keyof typeof DOSE_OUTCOMES
export const doseOutcomes = Object.keys(DOSE_OUTCOMES) as DoseOutcome[]

const has = (labels: object, value: unknown) => typeof value === "string" && Object.hasOwn(labels, value)

export const isConditionKind = (value: unknown): value is ConditionKind => has(CONDITION_KINDS, value)
export const isConditionSeverity = (value: unknown): value is ConditionSeverity => has(CONDITION_SEVERITIES, value)
export const isMedicationRoute = (value: unknown): value is MedicationRoute => has(MEDICATION_ROUTES, value)
export const isDoseOutcome = (value: unknown): value is DoseOutcome => has(DOSE_OUTCOMES, value)

export const isClockTime = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
