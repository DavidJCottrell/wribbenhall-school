// Looks for anything wider than the screen on phones, on every page and in the dialogs that hold forms.
//
//   1. Reset the test database and run a local build, as for the permission matrix.
//   2. node tests/e2e/overflow.mjs
//
// Needs Playwright with Chromium installed. It emulates a phone, so it catches layout that is too wide,
// but not every difference in how iOS Safari draws form controls. Never point this at a database that holds real data.
import { createRequire } from "node:module"

const { chromium } = createRequire(import.meta.url)("playwright")

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const PASSWORD = "dev-password-12345"
const WIDTHS = (process.env.WIDTHS ?? "320,375,390,430").split(",").map(Number)

const RIVER = "11111111-1111-4111-8111-111111111111"
const OAK = "22222222-2222-4222-8222-222222222222"
const INCIDENT = "a3333333-3333-4333-8333-333333333333"

const publicPages = ["/", "/about", "/calendar", "/gallery", "/policies", "/vacancies", "/contact", "/login", "/forgot-password"]
const staffPages = [
  "/portal", "/portal/register", "/portal/account", "/portal/incidents", `/portal/incidents/${INCIDENT}`, `/portal/incidents/${INCIDENT}/edit`,
  `/portal/incidents/new?pupil=${RIVER}`, "/portal/medical", "/portal/admin", "/portal/admin/users", "/portal/admin/pupils", `/portal/admin/pupils/${RIVER}`, "/portal/admin/audit",
  ...[RIVER, OAK].flatMap((id) => ["", "/attendance", "/reports", "/incidents", "/medical", "/medical/emergency", "/profile"].map((tab) => `/portal/pupils/${id}${tab}`)),
]
const parentPages = ["/portal", ...["", "/attendance", "/reports", "/incidents", "/medical", "/profile"].map((tab) => `/portal/pupils/${RIVER}${tab}`)]

// Buttons that open dialogs, by the page they are on.
const dialogs = [
  [`/portal/pupils/${RIVER}/medical`, ["Add medication", "Add a condition or allergy", "Record an entry"]],
  ["/portal/medical", ["Record"]],
  [`/portal/pupils/${RIVER}/reports`, ["Edit"]],
  [`/portal/admin/pupils/${RIVER}`, ["Add a contact"]],
]

async function measure(page) {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const root = document.documentElement
    const wide = []
    for (const element of document.querySelectorAll("body *")) {
      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (box.right > viewport + 1 || (box.left < -1 && box.left > -1000)) {
        const style = getComputedStyle(element)
        if (style.position === "fixed") continue
        // Anything inside a box that clips or scrolls on purpose is fine.
        let clipped = false
        for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          const overflow = getComputedStyle(parent).overflowX
          if (overflow !== "visible") { clipped = true; break }
        }
        if (!clipped) wide.push(`${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? `.${element.className.split(/\s+/).slice(0, 3).join(".")}` : ""} ${Math.round(box.left)}..${Math.round(box.right)}`)
      }
    }
    return { overflow: root.scrollWidth - viewport, wide: wide.slice(0, 4) }
  })
}

let problems = 0
let checked = 0
const report = (label, result) => {
  checked += 1
  if (result.overflow > 0 || result.wide.length > 0) {
    problems += 1
    console.log(`WIDE  ${label}: page is ${result.overflow}px too wide\n        ${result.wide.join("\n        ")}`)
  }
}

const browser = await chromium.launch()

async function signedIn(width, email) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  if (email) {
    const response = await context.request.post(`${BASE}/api/auth/sign-in/email`, { headers: { Origin: BASE }, data: { email, password: PASSWORD } })
    if (!response.ok()) throw new Error(`Could not log in as ${email} (HTTP ${response.status()}). Reset the database, and clear the rate_limit table if you were rate limited.`)
  }
  return context
}

for (const width of WIDTHS) {
  for (const [who, email, pages] of [["public", null, publicPages], ["staff", "admin@example.test", staffPages], ["parent", "parent@example.test", parentPages]]) {
    const context = await signedIn(width, email)
    const page = await context.newPage()
    for (const path of pages) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load" })
      await page.waitForTimeout(400)
      report(`${width}px ${who} ${path}`, await measure(page))
    }
    if (who === "staff") {
      for (const [path, buttons] of dialogs) {
        for (const name of buttons) {
          await page.goto(`${BASE}${path}`, { waitUntil: "load" })
          const button = page.getByRole("button", { name: new RegExp(`^${name}`) }).first()
          if ((await button.count()) === 0) { console.log(`SKIP  no "${name}" button on ${path}`); continue }
          await button.click()
          await page.waitForTimeout(500)
          report(`${width}px dialog "${name}" on ${path}`, await measure(page))
          // The dialog itself must also fit, and not need to scroll sideways.
          const dialog = page.getByRole("dialog")
          if ((await dialog.count()) > 0) {
            const sideways = await dialog.first().evaluate((node) => node.scrollWidth - node.clientWidth)
            report(`${width}px dialog "${name}" scrolls sideways`, { overflow: sideways > 1 ? sideways : 0, wide: [] })
          }
        }
      }
    }
    await context.close()
  }
}

await browser.close()
console.log(`\n${checked - problems} of ${checked} pages and dialogs fit on a phone${problems ? `, ${problems} too wide` : ""}`)
process.exit(problems ? 1 : 0)
