// Vercel runs this instead of `next build` (npm script "vercel-build").
import { spawnSync } from "node:child_process"

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Each preview can have its own database branch, copied when the git branch was first pushed,
// so it needs the latest migrations before the site is built against it.
// Production migrations are run by hand on purpose.
if (process.env.VERCEL_ENV === "preview") {
  run("npx", ["tsx", "--conditions=react-server", "scripts/db/migrate.mts"])
}

run("npm", ["run", "build"])
