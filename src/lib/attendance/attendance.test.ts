import { describe, expect, it } from "vitest"

import { normalizePermissions, type Actor, type Permission } from "@/lib/auth/permissions"
import { ukToday } from "@/lib/dates"

import { ATTENDANCE_CODES, attendanceCodes, categoryOf, dfeCode, isAbsence, isAttendanceCode, registerChoices, type AttendanceCode, type AttendanceMark } from "./codes"
import { RECENT_DAYS_EDITABLE, canRecordAttendanceOn } from "./rules"
import { PERSISTENT_ABSENCE_THRESHOLD, absenceReasons, adjacentWeekday, dayStrip, groupByWeek, isPersistentAbsence, isWeekday, schoolYearStart, summarise, weeklyBreakdown } from "./stats"

const mark = (date: string, code: AttendanceCode, session: "am" | "pm" = "am"): AttendanceMark => ({ date, session, code })
const staffWith = (...permissions: Permission[]): Actor => ({ kind: "staff", permissions: normalizePermissions(permissions) })

describe("codes", () => {
  it("knows which are real codes", () => {
    expect(isAttendanceCode("present")).toBe(true)
    expect(isAttendanceCode("nope")).toBe(false)
    expect(isAttendanceCode(undefined)).toBe(false)
  })

  it("puts every code in exactly one category", () => {
    for (const code of attendanceCodes) expect(["present", "authorised", "unauthorised", "closed"]).toContain(categoryOf(code))
  })

  it("treats only authorised and unauthorised codes as absences", () => {
    expect(isAbsence("illness")).toBe(true)
    expect(isAbsence("no_reason")).toBe(true)
    expect(isAbsence("present")).toBe(false)
    expect(isAbsence("late")).toBe(false)
    expect(isAbsence("closed")).toBe(false)
  })

  it("maps to DfE register marks, with present differing by session", () => {
    expect(dfeCode("present", "am")).toBe("/")
    expect(dfeCode("present", "pm")).toBe("\\")
    expect(dfeCode("illness", "am")).toBe("I")
    expect(dfeCode("closed", "pm")).toBe("#")
  })

  it("keeps the school-closed code out of the choices on the register", () => {
    expect(registerChoices).not.toContain("closed")
    expect(registerChoices.length).toBe(attendanceCodes.length - 1)
  })

  it("has a label for every code", () => {
    for (const code of attendanceCodes) expect(ATTENDANCE_CODES[code].label.length).toBeGreaterThan(0)
  })
})

describe("summarise", () => {
  it("returns no percentage when there is nothing to measure", () => {
    expect(summarise([]).percentage).toBeNull()
    expect(summarise([]).sessions).toBe(0)
  })

  it("counts present, late and off-site as attending", () => {
    const result = summarise([mark("2026-11-02", "present"), mark("2026-11-02", "late", "pm"), mark("2026-11-03", "off_site"), mark("2026-11-03", "illness", "pm")])
    expect(result).toMatchObject({ sessions: 4, attended: 3, late: 1, authorisedAbsences: 1, unauthorisedAbsences: 0, percentage: 75 })
  })

  it("counts authorised absence against the percentage, as the DfE does", () => {
    const result = summarise([mark("2026-11-02", "present"), mark("2026-11-02", "holiday", "pm")])
    expect(result.percentage).toBe(50)
  })

  it("ignores days the school was closed entirely", () => {
    const result = summarise([mark("2026-11-02", "closed"), mark("2026-11-02", "closed", "pm"), mark("2026-11-03", "present")])
    expect(result.sessions).toBe(1)
    expect(result.percentage).toBe(100)
  })

  it("rounds to one decimal place", () => {
    const marks = [mark("2026-11-02", "present"), mark("2026-11-03", "present"), mark("2026-11-04", "illness")]
    expect(summarise(marks).percentage).toBe(66.7)
  })

  it("separates unauthorised from authorised absence", () => {
    const result = summarise([mark("2026-11-02", "unauthorised"), mark("2026-11-03", "no_reason"), mark("2026-11-04", "medical")])
    expect(result).toMatchObject({ authorisedAbsences: 1, unauthorisedAbsences: 2, percentage: 0 })
  })
})

describe("persistent absence", () => {
  it("flags attendance below 90%, and not exactly 90%", () => {
    expect(PERSISTENT_ABSENCE_THRESHOLD).toBe(90)
    expect(isPersistentAbsence(89.9)).toBe(true)
    expect(isPersistentAbsence(90)).toBe(false)
    expect(isPersistentAbsence(100)).toBe(false)
  })

  it("does not flag a pupil with no data", () => {
    expect(isPersistentAbsence(null)).toBe(false)
  })
})

describe("schoolYearStart", () => {
  it("starts on 1 September of this year from September onwards", () => {
    expect(schoolYearStart("2026-09-01")).toBe("2026-09-01")
    expect(schoolYearStart("2026-11-16")).toBe("2026-09-01")
    expect(schoolYearStart("2026-12-31")).toBe("2026-09-01")
  })

  it("starts on 1 September of last year before September", () => {
    expect(schoolYearStart("2026-08-31")).toBe("2025-09-01")
    expect(schoolYearStart("2027-01-05")).toBe("2026-09-01")
    expect(schoolYearStart("2027-07-16")).toBe("2026-09-01")
  })
})

describe("weeklyBreakdown", () => {
  const today = "2026-11-18" // a Wednesday

  it("gives one entry per week, oldest first, ending with the current week", () => {
    const weeks = weeklyBreakdown([], { weeks: 3, today })
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"])
  })

  it("keeps weeks with no register, with no percentage", () => {
    const weeks = weeklyBreakdown([], { weeks: 2, today })
    expect(weeks.every((week) => week.percentage === null && week.sessions === 0)).toBe(true)
  })

  it("puts each mark in the week that contains its date, including Sunday in the previous week", () => {
    const weeks = weeklyBreakdown([mark("2026-11-15", "present"), mark("2026-11-16", "present"), mark("2026-11-16", "illness", "pm")], { weeks: 2, today })
    expect(weeks[0].sessions).toBe(1)
    expect(weeks[1].sessions).toBe(2)
    expect(weeks[1].percentage).toBe(50)
  })

  it("ignores marks outside the window", () => {
    const weeks = weeklyBreakdown([mark("2026-01-05", "present")], { weeks: 2, today })
    expect(weeks.reduce((total, week) => total + week.sessions, 0)).toBe(0)
  })
})

describe("dayStrip", () => {
  it("returns the last weekdays ending today, skipping weekends", () => {
    const strip = dayStrip([], { weekdays: 5, today: "2026-11-16" }) // a Monday
    expect(strip.map((day) => day.date)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-16"])
  })

  it("starts from the last school day when today is a weekend", () => {
    const strip = dayStrip([], { weekdays: 2, today: "2026-11-15" }) // a Sunday
    expect(strip.map((day) => day.date)).toEqual(["2026-11-12", "2026-11-13"])
  })

  it("fills in morning and afternoon marks and leaves gaps as null", () => {
    const strip = dayStrip([mark("2026-11-16", "present", "am"), mark("2026-11-16", "illness", "pm"), mark("2026-11-13", "late", "am")], { weekdays: 2, today: "2026-11-16" })
    expect(strip).toEqual([
      { date: "2026-11-13", am: "late", pm: null },
      { date: "2026-11-16", am: "present", pm: "illness" },
    ])
  })
})

describe("groupByWeek", () => {
  it("lays weekdays out as Monday to Friday rows, oldest first, with gaps as null", () => {
    const strip = dayStrip([], { weekdays: 8, today: "2026-11-18" }) // Wed 18th, back to Mon 9th
    const weeks = groupByWeek(strip)
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-11-09", "2026-11-16"])
    expect(weeks[0].days.map((day) => day?.date ?? null)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"])
    expect(weeks[1].days.map((day) => day?.date ?? null)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", null, null])
  })

  it("starts a partial first week part-way along the row", () => {
    const weeks = groupByWeek(dayStrip([], { weekdays: 3, today: "2026-11-16" })) // Mon, with Thu and Fri before it
    expect(weeks[0].days.map((day) => day?.date ?? null)).toEqual([null, null, null, "2026-11-12", "2026-11-13"])
  })
})

describe("absenceReasons", () => {
  it("counts absences by reason, most common first, and ignores attendance", () => {
    const reasons = absenceReasons([mark("2026-11-02", "illness"), mark("2026-11-03", "illness"), mark("2026-11-04", "medical"), mark("2026-11-05", "present"), mark("2026-11-06", "closed")])
    expect(reasons.map((reason) => [reason.code, reason.count])).toEqual([["illness", 2], ["medical", 1]])
  })

  it("breaks ties alphabetically so the order is stable", () => {
    const reasons = absenceReasons([mark("2026-11-02", "medical"), mark("2026-11-03", "illness")])
    expect(reasons.map((reason) => reason.code)).toEqual(["illness", "medical"])
  })
})

describe("weekdays", () => {
  it("recognises weekdays", () => {
    expect(isWeekday("2026-11-16")).toBe(true)
    expect(isWeekday("2026-11-14")).toBe(false)
  })

  it("moves to the next and previous school day over a weekend", () => {
    expect(adjacentWeekday("2026-11-13", 1)).toBe("2026-11-16")
    expect(adjacentWeekday("2026-11-16", -1)).toBe("2026-11-13")
    expect(adjacentWeekday("2026-11-16", 1)).toBe("2026-11-17")
  })
})

describe("canRecordAttendanceOn", () => {
  const today = "2026-11-18"

  it("lets someone who takes the register edit today and the last few days", () => {
    const actor = staffWith("attendance.record")
    expect(canRecordAttendanceOn(actor, today, today)).toBe(true)
    expect(canRecordAttendanceOn(actor, "2026-11-11", today)).toBe(true)
    expect(RECENT_DAYS_EDITABLE).toBe(7)
  })

  it("stops them editing older days", () => {
    expect(canRecordAttendanceOn(staffWith("attendance.record"), "2026-11-10", today)).toBe(false)
  })

  it("lets someone who manages attendance edit any past date", () => {
    expect(canRecordAttendanceOn(staffWith("attendance.manage"), "2025-09-02", today)).toBe(true)
  })

  it("never allows a future date, whoever asks", () => {
    expect(canRecordAttendanceOn(staffWith("attendance.manage"), "2026-11-19", today)).toBe(false)
    expect(canRecordAttendanceOn(staffWith("attendance.record"), "2026-11-19", today)).toBe(false)
  })

  it("refuses staff without the permission and parents", () => {
    expect(canRecordAttendanceOn(staffWith(), today, today)).toBe(false)
    expect(canRecordAttendanceOn({ kind: "parent", permissions: ["attendance.manage"] }, today, today)).toBe(false)
  })
})

describe("ukToday", () => {
  it("gives the UK date, which is ahead of UTC in summer after 11pm", () => {
    expect(ukToday(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01")
  })

  it("matches UTC in winter", () => {
    expect(ukToday(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01")
  })
})
