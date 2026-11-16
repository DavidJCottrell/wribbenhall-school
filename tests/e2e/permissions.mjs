// Permission matrix for the portal. Logs in as each fictional persona over plain HTTP and checks what they can and can't reach.
//
//   1. Reset the test database:  npm run db:reset-preview  (or the SQL in scripts/db/reset-preview.sql)
//   2. Build and start the site against it:  npm run build && npm start
//   3. In another window:  npm run test:e2e
//
// Needs a local build, because it reads the server action ids from .next. Sign-in is rate limited, so wait five minutes between runs
// or clear the rate_limit table. Never point this at a database that holds real data.
import { readFileSync } from "node:fs"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const PASSWORD = "dev-password-12345"
// A page that really rendered contains its own marker. (The not-found message is also present in the page data as a fallback,
// so its absence proves nothing.)
const PUPIL_PAGE = "Pupil sections"

const RIVER = "11111111-1111-4111-8111-111111111111"
const OAK = "22222222-2222-4222-8222-222222222222"
const ASH = "33333333-3333-4333-8333-333333333333"
const WILLOW = "44444444-4444-4444-8444-444444444444"

const personas = {
  admin: "admin@example.test",
  teacher: "staff@example.test",
  support: "staff2@example.test",
  office: "office@example.test",
  basic: "basic@example.test",
  pat: "parent@example.test",
  sam: "other-parent@example.test",
  chris: "carer@example.test",
}

let failures = 0
let checks = 0
function check(description, ok, detail = "") {
  checks += 1
  if (!ok) failures += 1
  console.log(`${ok ? "PASS" : "FAIL"}  ${description}${ok || !detail ? "" : `\n        ${detail}`}`)
}

async function login(email) {
  const response = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  if (!response.ok) throw new Error(`Could not log in as ${email} (HTTP ${response.status}). Reset the database, and wait if you were rate limited.`)
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ")
}

const cookies = {}
for (const [name, email] of Object.entries(personas)) cookies[name] = await login(email)

async function page(persona, path) {
  const response = await fetch(`${BASE}${path}`, { headers: { Cookie: cookies[persona] }, redirect: "manual" })
  return { status: response.status, html: await response.text() }
}

const manifest = JSON.parse(readFileSync(new URL("../../.next/server/server-reference-manifest.json", import.meta.url), "utf8"))
const actionId = (name) => {
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name)
  if (!entry) throw new Error(`No server action called ${name}. Is the build current?`)
  return entry[0]
}

// Calls a server action directly, the way someone bypassing the screens would.
async function callAction(persona, name, args) {
  const response = await fetch(`${BASE}/portal`, {
    method: "POST",
    headers: { Cookie: cookies[persona], "Next-Action": actionId(name), "Content-Type": "text/plain;charset=UTF-8", Origin: BASE },
    body: JSON.stringify(args),
  })
  const text = await response.text()
  return { ok: /"ok":true/.test(text), message: text.match(/"message":"([^"]*)"/)?.[1] ?? "", userId: text.match(/"userId":"([^"]*)"/)?.[1] }
}

const refused = (result) => !result.ok && /permission|could not be found|session/i.test(result.message)

// ---- Which pupils each person sees on the home page
const names = { River: "River Example", Oak: "Oakley Example", Ash: "Ash Sample", Willow: "Willow Brook" }
const expectedPupils = {
  admin: ["River", "Oak", "Ash", "Willow"],
  teacher: ["River", "Oak", "Ash", "Willow"],
  support: ["River", "Oak", "Ash", "Willow"],
  office: ["River", "Oak", "Ash", "Willow"],
  basic: ["River", "Oak", "Ash", "Willow"],
  pat: ["River", "Oak"],
  sam: ["Ash"],
  chris: ["Willow"],
}
for (const [persona, shown] of Object.entries(expectedPupils)) {
  const { html } = await page(persona, "/portal")
  const seen = Object.keys(names).filter((key) => html.includes(names[key]))
  check(`${persona} sees exactly ${shown.join(", ")} on the home page`, seen.join() === shown.join(), `saw ${seen.join(", ")}`)
}

// ---- Opening a pupil
const openable = (persona, id) => page(persona, `/portal/pupils/${id}`).then(({ html }) => html.includes(PUPIL_PAGE))
check("every member of staff can open any pupil", (await Promise.all(["admin", "teacher", "support", "office", "basic"].map((p) => openable(p, ASH)))).every(Boolean))
check("a parent can open their own children", (await openable("pat", RIVER)) && (await openable("pat", OAK)) && (await openable("sam", ASH)) && (await openable("chris", WILLOW)))
check("a parent can't open another family's child", !(await openable("sam", RIVER)) && !(await openable("pat", ASH)) && !(await openable("pat", WILLOW)) && !(await openable("chris", RIVER)))
{
  const { html } = await page("sam", `/portal/pupils/${RIVER}`)
  check("and nothing about that child is sent to them", !html.includes("River Example") && !html.includes("Test Council"))
}
check("a made-up pupil id is not found", !(await openable("admin", "99999999-9999-4999-8999-999999999999")) && !(await openable("admin", "not-a-uuid")))

// ---- Nothing staff-only reaches a parent, in the page or its data payload
const staffOnly = ["Test Council", "Gran Example", "Collects on Fridays", "Admission date", "Leaving date", "Staff note: sensory break", "Assessment in progress", "Local authority"]
for (const path of [`/portal/pupils/${RIVER}`, `/portal/pupils/${RIVER}/profile`, `/portal/pupils/${RIVER}/reports`]) {
  const { html } = await page("pat", path)
  const leaked = staffOnly.filter((text) => html.includes(text))
  check(`a parent's ${path.split("/").pop() === RIVER ? "overview" : path.split("/").pop()} page holds no staff-only data`, leaked.length === 0, `leaked: ${leaked.join(", ")}`)
}
{
  const { html } = await page("pat", `/portal/pupils/${RIVER}/profile`)
  check("a parent sees their own linked contact entry", html.includes("Pat Example"))
}
{
  const { html } = await page("teacher", `/portal/pupils/${RIVER}/profile`)
  check("staff see the full profile and every contact", ["Test Council", "Gran Example", "Collects on Fridays"].every((text) => html.includes(text)))
}

// ---- Daily reports
{
  const staff = await page("basic", `/portal/pupils/${RIVER}/reports`)
  const parent = await page("pat", `/portal/pupils/${RIVER}/reports`)
  check("staff see staff-only reports", staff.html.includes("Staff note: sensory break"))
  check("a parent sees parent-visible reports only", parent.html.includes("Reading together") && !parent.html.includes("sensory break"))
  for (const [persona, expected] of [["admin", true], ["teacher", true], ["support", true], ["office", true], ["basic", false], ["pat", false]]) {
    const { html } = await page(persona, `/portal/pupils/${RIVER}/reports`)
    check(`${persona} ${expected ? "can" : "can't"} add a daily report`, html.includes("Add a daily report") === expected)
  }
  check("reports are shown day by day, with the part of the day and subject", staff.html.includes("Day by day") && staff.html.includes("English") && staff.html.includes("Morning"))
  check("a parent sees that day's attendance beside the reports", /Morning: (?:<!-- -->)?[A-Z]/.test(parent.html))
  check("a parent never sees staff-only subjects or who a note is for", !parent.html.includes("Staff only"))
  const older = await page("pat", `/portal/pupils/${RIVER}/reports?before=not-a-date`)
  check("a bad date in the address falls back to the latest days", older.status === 200 && older.html.includes("Day by day"))

  const uploadToken = async (persona, purpose) => {
    const response = await fetch(`${BASE}/api/portal/uploads`, {
      method: "POST",
      headers: { Cookie: cookies[persona], "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: { pathname: `children/${RIVER}/probe.pdf`, clientPayload: JSON.stringify({ childId: RIVER, purpose }), multipart: false },
      }),
    })
    return response.status
  }
  for (const persona of ["basic", "pat", "sam"]) {
    check(`${persona} is refused an upload token for a daily report`, (await uploadToken(persona, "day_report")) >= 400)
  }
  check("an unknown upload purpose is refused even for the head teacher", (await uploadToken("admin", "medical")) >= 400)
}

// ---- Administration pages
const adminPages = [
  ["/portal/admin/users", "Create a login", { admin: true }],
  ["/portal/admin/pupils", "Add a pupil", { admin: true, office: true }],
  [`/portal/admin/pupils/${RIVER}`, "Parent logins", { admin: true, office: true }],
  ["/portal/admin/audit", "Show one pupil", { admin: true }],
  ["/portal/admin", "complete their profiles and contacts", { admin: true, office: true }],
]
for (const [path, marker, allowed] of adminPages) {
  for (const persona of Object.keys(personas)) {
    const { html } = await page(persona, path)
    check(`${persona} ${allowed[persona] ? "can" : "can't"} open ${path.replace(RIVER, ":id")}`, html.includes(marker) === Boolean(allowed[persona]))
  }
}
{
  const office = await page("office", "/portal/admin")
  check("the administration home only lists what the person may use", office.html.includes("Pupils") && !office.html.includes("Logins and permissions") && !office.html.includes("Audit log"))
  const basic = await page("basic", "/portal")
  const admin = await page("admin", "/portal")
  check("only people with an admin permission see the Administration link", !basic.html.includes("Administration") && admin.html.includes("Administration"))
}

// ---- Direct server-action calls by people who must be refused
const validPupil = { firstName: "Probe", lastName: "Pupil", yearGroup: "Year 1" }
const validLogin = { name: "Probe Person", email: `probe.${Date.now()}@example.test`, kind: "staff", permissions: [] }
const validContact = { name: "Probe", relationship: "Friend", phone: "", email: "", parentalResponsibility: false, emergencyContact: false, authorisedToCollect: false, notes: "", linkedUserId: "" }
const validReport = { title: "Probe", reportDate: "2026-11-16", session: "", subject: "", body: "x", visibleToParents: true }
const REPORT_ID = "99999999-9999-4999-8999-999999999999"
const profile = { ...validPupil, preferredName: "", dateOfBirth: "", admissionDate: "", leavingDate: "", keyWorkerId: "", ehcpStatus: "", localAuthority: "", ehcpReviewDue: "" }

const attempts = [
  ["createUser", [validLogin], ["teacher", "support", "office", "basic", "pat"]],
  ["updateUser", ["seed-staff-basic", validLogin], ["teacher", "office", "basic", "pat"]],
  ["resetPassword", ["seed-staff-basic"], ["teacher", "office", "basic", "pat"]],
  ["setUserDisabled", ["seed-staff-basic", true], ["teacher", "office", "pat"]],
  ["deleteUser", ["seed-staff-basic", "basic@example.test"], ["teacher", "office", "pat"]],
  ["createPupil", [validPupil], ["teacher", "support", "basic", "pat"]],
  ["updatePupil", [RIVER, profile], ["teacher", "basic", "pat"]],
  ["setPupilArchived", [RIVER, true], ["teacher", "basic", "pat"]],
  ["deletePupil", [RIVER, "River Example"], ["teacher", "basic", "pat"]],
  ["saveContact", [RIVER, null, validContact], ["teacher", "basic", "pat"]],
  ["linkGuardian", [RIVER, { userId: "seed-parent-sam", relationship: "" }], ["teacher", "basic", "pat"]],
  ["addDayReport", [RIVER, validReport, []], ["basic", "pat", "sam"]],
  ["updateDayReport", [REPORT_ID, validReport, [], []], ["basic", "pat", "sam"]],
  ["deleteDayReport", [REPORT_ID], ["basic", "pat", "sam"]],
]
for (const [name, args, who] of attempts) {
  for (const persona of who) {
    const result = await callAction(persona, name, args)
    check(`${persona} is refused when calling ${name} directly`, refused(result), result.message)
  }
}
{
  const before = (await page("admin", "/portal/admin/pupils")).html
  check("none of those attempts changed anything", before.includes("River Example") && !before.includes("Probe Pupil") && !(await page("admin", "/portal/admin/users")).html.includes("probe."))
}


// ---- Attendance
const ukDay = (daysBack) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(Date.now() - daysBack * 86_400_000))
const today = ukDay(0)
const longAgo = ukDay(200) // outside the seeded weeks, so nothing exists there
const recentlyPast = ukDay(10) // inside the seeded weeks, so marks exist
const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(Date.now() + 86_400_000))

{
  for (const persona of Object.keys(personas)) {
    const { html } = await page(persona, "/portal/register")
    const isStaff = !["pat", "sam", "chris"].includes(persona)
    check(`${persona} ${isStaff ? "can" : "can't"} open the register`, html.includes("Note for staff") === isStaff)
  }
  for (const [persona, canEdit] of [["admin", true], ["teacher", true], ["support", true], ["office", true], ["basic", false]]) {
    const { html } = await page(persona, "/portal/register")
    check(`${persona} ${canEdit ? "can" : "can't"} edit today's register`, html.includes("Save register") === canEdit)
  }
  const old = await page("teacher", `/portal/register?date=${longAgo}`)
  check("someone who takes the register can't edit a date long ago", !old.html.includes("Save register") && old.html.includes("Only people who manage attendance"))
  const oldManager = await page("office", `/portal/register?date=${longAgo}`)
  check("someone who manages attendance can", oldManager.html.includes("Save register"))
  const future = await page("admin", `/portal/register?date=${tomorrow}`)
  check("nobody gets a future date, the page falls back to today", new RegExp(`Register for (?:<!-- -->)?${today}`).test(future.html))

  for (const persona of ["admin", "teacher", "basic", "office"]) {
    const { html } = await page(persona, `/portal/pupils/${ASH}/attendance`)
    check(`${persona} sees a pupil's attendance`, html.includes("Why sessions were missed"))
  }
  check("a parent sees their own child's attendance", (await page("pat", `/portal/pupils/${RIVER}/attendance`)).html.includes("Why sessions were missed"))
  const other = await page("sam", `/portal/pupils/${RIVER}/attendance`)
  check("a parent can't see another family's child's attendance", !other.html.includes("Why sessions were missed") && !other.html.includes("River Example"))
}

// Notes on the register are for staff only.
{
  const note = "SECRET-REGISTER-NOTE"
  const saved = await callAction("teacher", "saveRegister", [{ date: today, rows: [{ pupilId: RIVER, am: "present", pm: "", note }] }])
  check("someone who takes the register can save today's register", saved.ok, saved.message)
  const staffView = await page("admin", `/portal/pupils/${RIVER}/attendance`)
  check("staff see the note on the pupil's attendance page", staffView.html.includes(note))
  for (const path of [`/portal/pupils/${RIVER}`, `/portal/pupils/${RIVER}/attendance`, `/portal/pupils/${RIVER}/profile`]) {
    const parentView = await page("pat", path)
    check(`the note never reaches a parent (${path.replace(RIVER, ":id").split("/").slice(-1)[0] || "overview"})`, !parentView.html.includes(note))
  }
  await callAction("teacher", "saveRegister", [{ date: today, rows: [{ pupilId: RIVER, am: "present", pm: "", note: "" }] }])
}

// Direct calls
{
  const rows = [{ pupilId: RIVER, am: "present", pm: "present", note: "" }]
  for (const persona of ["basic", "pat", "sam"]) {
    const result = await callAction(persona, "saveRegister", [{ date: today, rows }])
    check(`${persona} is refused when saving the register directly`, refused(result), result.message)
  }
  const tooOld = await callAction("teacher", "saveRegister", [{ date: longAgo, rows: [] }])
  check("someone who takes the register is refused an old date", !tooOld.ok && /can't change the register/i.test(tooOld.message), tooOld.message)
  const manager = await callAction("office", "saveRegister", [{ date: longAgo, rows: [] }])
  check("someone who manages attendance is allowed an old date", manager.ok, manager.message)
  const futureSave = await callAction("admin", "saveRegister", [{ date: tomorrow, rows }])
  check("nobody can save a register for the future", !futureSave.ok, futureSave.message)
  const badCode = await callAction("teacher", "saveRegister", [{ date: today, rows: [{ pupilId: RIVER, am: "closed", pm: "", note: "" }] }])
  check("the school-closed code can't be set pupil by pupil", !badCode.ok, badCode.message)
  const badPupil = await callAction("teacher", "saveRegister", [{ date: today, rows: [{ pupilId: "99999999-9999-4999-8999-999999999999", am: "present", pm: "", note: "" }] }])
  check("a made-up pupil is refused", !badPupil.ok && /could not be found/i.test(badPupil.message), badPupil.message)

  for (const persona of ["teacher", "support", "basic", "pat"]) {
    const result = await callAction(persona, "closeSchoolDay", [{ date: longAgo }])
    check(`${persona} is refused when closing a school day`, refused(result), result.message)
  }
  const closeFuture = await callAction("admin", "closeSchoolDay", [{ date: tomorrow }])
  check("a future day can't be closed", !closeFuture.ok, closeFuture.message)
  const needsConfirm = await callAction("admin", "closeSchoolDay", [{ date: recentlyPast }])
  check("closing a day that already has marks asks for confirmation first", !needsConfirm.ok && /would be replaced/i.test(needsConfirm.message), needsConfirm.message)
  const stillMarked = (await page("admin", `/portal/register?date=${recentlyPast}`)).html
  check("and changes nothing until confirmed", !stillMarked.includes("The school was closed on this day"))
}

// Closing and reopening a day
{
  const closed = await callAction("admin", "closeSchoolDay", [{ date: longAgo }])
  check("an administrator can close a school day", closed.ok, closed.message)
  check("a closed day shows as closed on the register", (await page("teacher", `/portal/register?date=${longAgo}`)).html.includes("The school was closed on this day"))
  const typedOver = await callAction("office", "saveRegister", [{ date: longAgo, rows: [{ pupilId: RIVER, am: "present", pm: "", note: "" }] }])
  check("a closed day can't be typed over", !typedOver.ok && /closed/i.test(typedOver.message), typedOver.message)
  const refusedReopen = await callAction("teacher", "reopenSchoolDay", [{ date: longAgo }])
  check("someone who only takes the register can't reopen it", refusedReopen && refused(refusedReopen), refusedReopen.message)
  const reopened = await callAction("admin", "reopenSchoolDay", [{ date: longAgo }])
  check("and it can be reopened by someone who manages attendance", reopened.ok, reopened.message)
  check("a reopened day is open again", !(await page("teacher", `/portal/register?date=${longAgo}`)).html.includes("The school was closed on this day"))
}

// The home page figures
{
  const home = (await page("teacher", "/portal")).html
  check("staff see today's register status and attendance flags on the home page", home.includes("pupils marked for both sessions") && home.includes("Attendance below 90%"))
  const parentHome = (await page("pat", "/portal")).html
  check("a parent's home page has no staff register panel", !parentHome.includes("pupils marked for both sessions") && !parentHome.includes("Attendance below 90%"))
}

// ---- Rules that protect the system
{
  const adminId = "seed-admin"
  const everythingButUsers = ["pupils.manage", "audit.view", "attendance.record", "attendance.manage", "reports.write", "reports.manage", "incidents.view", "incidents.record", "incidents.review", "medical.view", "medical.record", "medical.manage"]
  const removeOwn = await callAction("admin", "updateUser", [adminId, { name: "Robin Admin", email: "admin@example.test", kind: "staff", permissions: everythingButUsers }])
  check("an administrator can't remove their own ability to manage logins", !removeOwn.ok && /own ability/i.test(removeOwn.message), removeOwn.message)
  const demoteSelf = await callAction("admin", "updateUser", [adminId, { name: "Robin Admin", email: "admin@example.test", kind: "parent", permissions: [] }])
  check("an administrator can't turn their own login into a parent login", !demoteSelf.ok, demoteSelf.message)
  const disableSelf = await callAction("admin", "setUserDisabled", [adminId, true])
  check("an administrator can't disable their own login", !disableSelf.ok && /own login/i.test(disableSelf.message), disableSelf.message)
  const deleteSelf = await callAction("admin", "deleteUser", [adminId, "admin@example.test"])
  check("an administrator can't delete their own login", !deleteSelf.ok && /own login/i.test(deleteSelf.message), deleteSelf.message)
}

// ---- Creating a login with chosen permissions, and the audit trail
{
  const email = `created.${Date.now()}@example.test`
  const created = await callAction("admin", "createUser", [{ name: "Created Person", email, kind: "staff", permissions: ["incidents.review"] }])
  check("an administrator can create a login with chosen permissions", created.ok, created.message)
  const users = (await page("admin", "/portal/admin/users")).html
  check("the new login shows the permissions it was given, including the ones they include", users.includes(email) && /Staff, 3 of 13 permissions/.test(users))
  const removed = await callAction("admin", "deleteUser", [created.userId, email])
  check("and can delete it again", removed.ok, removed.message)
}
{
  await page("teacher", `/portal/pupils/${RIVER}/profile`)
  await new Promise((resolve) => setTimeout(resolve, 2500))
  const audit = (await page("admin", "/portal/admin/audit")).html
  check("viewing a profile is recorded in the audit log", audit.includes("Viewed the profile and contacts") && audit.includes("Alex Teacher"))
  check("changes made by an administrator are recorded in the audit log", audit.includes("Created a staff login for Created Person"))
  check("register changes are recorded in the audit log", audit.includes("Recorded the register for") && audit.includes("Closed the school for"))
}

console.log(`\n${checks - failures} of ${checks} checks passed${failures ? `, ${failures} FAILED` : ""}`)
process.exit(failures ? 1 : 0)
