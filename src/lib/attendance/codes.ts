// Attendance codes, in plain words. Each maps to the DfE register code, so a census or inspection export is a lookup away.
// Whether the school's own register uses exactly these is worth confirming. They follow common DfE practice.

export const ATTENDANCE_SESSIONS = ["am", "pm"] as const

export type AttendanceSession = (typeof ATTENDANCE_SESSIONS)[number]

export const SESSION_LABELS: Record<AttendanceSession, string> = { am: "Morning", pm: "Afternoon" }

// present counts towards attendance. closed is left out of every count. The rest are absences.
export type AttendanceCategory = "present" | "authorised" | "unauthorised" | "closed"

type CodeDefinition = {
  label: string
  category: AttendanceCategory
  // The DfE register mark. Present is "/" in the morning and "\" in the afternoon.
  dfe: string
}

export const ATTENDANCE_CODES = {
  present: { label: "Present", category: "present", dfe: "/" },
  late: { label: "Late, before the register closed", category: "present", dfe: "L" },
  off_site: { label: "Educated off site", category: "present", dfe: "B" },
  illness: { label: "Illness", category: "authorised", dfe: "I" },
  medical: { label: "Medical or dental appointment", category: "authorised", dfe: "M" },
  religious: { label: "Religious observance", category: "authorised", dfe: "R" },
  holiday: { label: "Authorised holiday", category: "authorised", dfe: "H" },
  authorised_other: { label: "Other authorised absence", category: "authorised", dfe: "C" },
  no_reason: { label: "Absent, no reason given yet", category: "unauthorised", dfe: "N" },
  unauthorised: { label: "Unauthorised absence", category: "unauthorised", dfe: "O" },
  closed: { label: "School closed", category: "closed", dfe: "#" },
} as const satisfies Record<string, CodeDefinition>

export type AttendanceCode = keyof typeof ATTENDANCE_CODES

export const attendanceCodes = Object.keys(ATTENDANCE_CODES) as AttendanceCode[]

export function isAttendanceCode(value: unknown): value is AttendanceCode {
  return typeof value === "string" && Object.hasOwn(ATTENDANCE_CODES, value)
}

export function isAttendanceSession(value: unknown): value is AttendanceSession {
  return typeof value === "string" && (ATTENDANCE_SESSIONS as readonly string[]).includes(value)
}

export const categoryOf = (code: AttendanceCode): AttendanceCategory => ATTENDANCE_CODES[code].category

export const isAbsence = (code: AttendanceCode) => ["authorised", "unauthorised"].includes(categoryOf(code))

export function dfeCode(code: AttendanceCode, session: AttendanceSession) {
  if (code === "present") return session === "am" ? "/" : "\\"
  return ATTENDANCE_CODES[code].dfe
}

// Codes a person can choose when taking the register. School closed is set for the whole school at once.
export const registerChoices = attendanceCodes.filter((code) => code !== "closed")

export type AttendanceMark = {
  date: string
  session: AttendanceSession
  code: AttendanceCode
}
