// Vercel runs this instead of `next build` (npm script "vercel-build").
import { spawnSync } from "node:child_process"

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Migrations run before the build, so a failed migration fails the deploy and the live site keeps running its old code.
// Previews each have their own database branch, copied when the git branch was first pushed, so they need the latest too.
// The old code stays live while this runs, so a migration must not break it. Drop or rename things in a later PR.
if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production") {
  run("npx", ["tsx", "--conditions=react-server", "scripts/db/migrate.mts"])
}

run("npm", ["run", "build"])
