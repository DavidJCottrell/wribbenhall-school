@AGENTS.md

# Wribbenhall School website

Public website for Wribbenhall School, a special education school in Bewdley, plus a private portal where staff keep pupil records and parents see their own child's information. Next.js App Router with Cache Components, Tailwind CSS 4, shadcn/ui, Better Auth, Drizzle on Neon Postgres, Vercel Blob. Deployed on Vercel from this repo.

## Git workflow

- `main` is production. Every merge to `main` goes live on the school's real site.
- Never commit or push to `main`, and never force-push.
- Work on a branch named `claude/<short-description>`, for example `claude/update-term-dates`.
- Push the branch and open a pull request. Vercel builds a preview for each PR; mention what to look at in the PR description.
- If the PR needs anything done on production first (a migration, a new setting), say so in a "Before merging" section. See "Releasing" below.
- Keep each PR to one change so it is easy to review and revert.
- Do not merge your own PRs. The owner reviews the preview and merges.
- Pull the latest changes before starting. The owner also edits from a laptop.

## Before pushing

Run all four and fix anything they report:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same four on every PR (`.github/workflows/ci.yml`) with no environment variables, so the build must work without a database or secrets. `npm run typecheck` generates Next's route types first, so it works on a fresh checkout.

Changes to the portal's permissions or data access also need the permission matrix to pass. See `tests/e2e/permissions.mjs` for how to run it.

Changes to layout, forms or dialogs also need `tests/e2e/overflow.mjs` to pass. It opens every page and form dialog at phone widths and fails if anything is wider than the screen. See the top of that file for how to run it.

## Services and how they connect

| Service | What it does here | How it is set up |
| --- | --- | --- |
| **Vercel** | Hosts the site. `main` is Production. Every PR gets a Preview. Runs the nightly cleanup job. | `vercel.json` holds the cron schedule. The `vercel-build` script (`scripts/vercel-build.mjs`) migrates the database on **Preview and Production** builds before building. A failed migration fails the build, so the live site keeps its old code. |
| **Neon (Postgres)** | The portal's database. | Two separate Neon projects: one for Preview, one for Production. The integration gives each git branch its own Neon branch, copied from the Preview project's `main` when the branch is first pushed. A new PR starts with whatever `main` holds then. An existing PR keeps its own copy, so it can be missing newer test data. |
| **Vercel Blob** | Private file storage for report attachments. | One private store for Preview and one for Production. Browsers upload straight to it using short-lived tokens. Files are only ever served through `/portal/files/[id]`, which applies the same rules as the reports they belong to. |
| **Better Auth** | Logins, sessions, password reset. | Configured in `src/lib/auth/auth.ts`. There is no public sign-up. The school creates every login. |
| **Resend** | Sends password reset emails. | Needs an account, a verified sending domain, and an API key. Outside Production, emails are printed to the server log instead of sent. |
| **Vercel Cron** | Deletes uploaded files that were never saved (over 24 hours old, not attached to anything). | `/api/cron/cleanup-uploads`, daily, protected by `CRON_SECRET`. Only runs on Production. Add `?dryRun=1` to see what it would remove. |
| **GitHub Actions** | Lint, typecheck, tests and build on every PR. | `.github/workflows/ci.yml`. |

### Settings

Every setting is listed in `.env.example`. Never commit real values or `.env*` files. In Vercel, scope each one as shown:

| Setting | Production | Preview and Development |
| --- | --- | --- |
| `DATABASE_URL` | the Production Neon database | the Preview Neon database (the integration sets it per branch) |
| `AUTH_SECRET` | a long random value | a different long random value |
| `BLOB_READ_WRITE_TOKEN` | the Production store's token | the Preview store's token |
| `BETTER_AUTH_URL` | the live site's address, no trailing slash. Reset links are built from it, never from the request | leave unset |
| `RESEND_API_KEY`, `EMAIL_FROM` | set. `EMAIL_FROM` must use the verified domain | leave unset |
| `CRON_SECRET` | a long random value | leave unset |
| `FORMS_WEBHOOK_URL` | where form submissions go | leave unset, so previews never send to the school |

Without `RESEND_API_KEY` on Production, password reset still looks like it works but sends nothing, and logs an error without writing the link to the logs. Without `CRON_SECRET`, the cleanup job answers 503 and nothing is removed.

## Database

- The schema is `src/db/schema.ts`. Migrations are in `drizzle/`. Change the schema, then `npm run db:generate -- --name <what-changed>`, and commit the new SQL and snapshot.
- `drizzle-kit` asks an interactive question if one table is dropped and another created in the same change (it can't tell a rename). Split it into two migrations.
- Put any data conversion in the migration SQL. Migration `0005` converted the old `admin` role to staff with every permission.
- `npm run db:migrate` applies pending migrations to whichever database `DATABASE_URL` points at.
- **Previews and Production migrate themselves** during the Vercel build, before the site is built. Merging a PR that adds a migration applies it to Production. Nobody runs it by hand. Never use Production credentials in a Claude session.
- The old code keeps serving while the migration runs, for a minute or two. So each PR's migrations must be safe for the code already live: add tables and columns first, and drop or rename things in a later PR once nothing uses them. Say in the PR if a migration is not safe that way.
- A migration is applied to real data with no human step. Read the generated SQL, and put data conversions in it carefully. Neon keeps point-in-time history if a restore is needed.
- Create the first administrator on a new database with `ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run db:create-admin`. It makes a staff login holding every permission.

### Test data

Fictional data lives in `scripts/db/fixtures.mts`. Every login uses an `@example.test` address and the password `dev-password-12345`. They cover a head teacher with every permission, teacher, learning support and office presets, a staff member with none, and three parents.

- `ALLOW_DEV_SEED=true npm run db:seed` adds the fixtures.
- `ALLOW_DEV_SEED=true npm run db:reset-preview` wipes a test database and refills it. On its own it only shows what it would wipe. It runs once `CONFIRM_RESET_HOST` matches the database host. Add `-- --files` to also clear the Blob store.
- Both refuse to run if any login in the database is not an `@example.test` address, so they can't wipe real data.
- `scripts/db/reset-preview.sql` does the same job from the Neon SQL Editor. It is generated. Edit the fixtures and run `npm run db:generate-reset-sql`. A test fails if it goes stale.
- Run it on the Neon branch the preview site actually uses (the `preview/claude/...` branch for a PR). A different branch changes a different database.
- Never run the seed or reset against Production. Never put real pupil or parent data in Preview or test databases.

## The portal

- Staff access comes from individual permissions, not roles. `src/lib/auth/permissions.ts` is the one catalogue, with `can()`. Never decide what someone may do by checking whether they are staff or a parent. Check a permission. The head teacher holds every permission.
- All staff see all pupils. Parents see only pupils linked to their login, and only records marked visible to parents.
- `requireUser()` guards pages and `getActionUser()` guards server actions and route handlers. Every server action re-checks, because a client can call any exported action directly.
- `src/lib/portal/` is the data access layer. Parent-facing queries are separate functions that select only parent-safe columns, so staff-only data can't reach a parent through a shared query.
- Writes and sensitive views go in the audit log (`src/lib/audit.ts`).
- Dates are `YYYY-MM-DD` strings in UK time. Use `ukToday()`. The server runs in UTC, so `new Date()` is wrong just after midnight in summer.
- This is special category data about children. Real data must not go in until the school's data protection lead has signed off.
- `docs/portal-roadmap.md` records the decisions, what is built, and what comes next.

## Releasing a portal change

1. PR description lists anything to do on Production first: settings to add, and any migration that is not safe for the code currently live.
2. The owner adds any settings, then merges. Migrations apply during the Production build.
3. The owner checks the live site (log in, open a pupil).

Settings the owner has had to add by hand so far: the Production database and Blob token, `AUTH_SECRET`, and for password reset, `RESEND_API_KEY`, `EMAIL_FROM` and `BETTER_AUTH_URL`, plus `CRON_SECRET` for the cleanup job.

## Working in a Claude cloud session

- The session's environment variables must hold **Preview** values only (`DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`), never Production's. Secrets go in the environment settings, never in chat.
- Network access is an allowlist. The Neon driver uses HTTPS only, not raw Postgres, so it needs the Preview Neon hosts (pooled, direct, and the regional API host). Blob needs `blob.vercel-storage.com`, `vercel.com`, and the Preview store's own `*.private.blob.vercel-storage.com` host, by exact name.
- Run Node scripts that use the network with `NODE_USE_ENV_PROXY=1`. For browser tests, set Playwright's proxy and bypass `localhost`.
- Preview URLs can't be opened from a session. Ask the owner to test there.
- Sign-in is rate limited to 15 attempts per 5 minutes per IP address. Clear the `rate_limit` table between test runs.

## Project layout

- `src/app` routes and server actions (`src/app/actions/`)
- `src/components` UI, grouped by area (`site`, `home`, `calendar`, `gallery`, `policies`, `contact`, `vacancies`, `forms`, `portal`, `charts`, `ui`)
- `src/content/*.json` all site content (school details, events, policies, gallery, vacancies)
- `src/lib/content` content providers and zod schemas
- `src/lib/forms/schemas.ts` form schemas shared by client and server
- `src/lib/auth/` permissions, sessions, and account administration
- `src/lib/portal/` portal data access
- `src/lib/attendance/` attendance codes, statistics and editing rules as plain functions with unit tests. Keep the arithmetic here, never in components.
- `src/components/charts/` hand-built SVG charts. Colours come from the `--chart-*` tokens in `globals.css`, which were checked with the data-viz palette validator. Re-run the validator before changing them. Every chart needs a "view as a table" alternative and must work in the high-contrast scheme.
- `src/db/schema.ts` and `drizzle/` the database and its migrations
- `scripts/db/` migrations runner, seed fixtures, and the test-database reset
- `tests/e2e/` the permission matrix, run against a local build and a test database
- `docs/` the portal roadmap and notes on the public site
- `public/media` images

## Content

- Content changes go in `src/content/*.json`. Components should not hard-code school details.
- Every collection is validated by the zod schemas in `src/lib/content/schema.ts`. Change the schema and the JSON together.
- Images are referenced by key and resolved through `mediaUrl()` in `src/lib/media.ts`. Do not hard-code image URLs.
- Policy and vacancy documents are links (usually Google Drive), not files in the repo.
- Term dates in `academic-years.json` were inferred from holidays. Do not present them as confirmed without checking with the school.
- Do not invent school facts, staff details, policies or dates. If something is missing, say so in the PR.

## Conventions

- Server components by default. Add `"use client"` only where interactivity needs it.
- Follow the Cache Components rules from `AGENTS.md`: await `params` inside `<Suspense>`, and do not call `new Date()` during prerender (use the `useToday` hook on the client).
- Forms use react-hook-form with zod. Reuse the shared schema on both client and server. Keep the honeypot field on public forms.
- Use existing shadcn components in `src/components/ui` before adding new ones.
- Keep the established design: Severn palette tokens and fonts from `globals.css`. Do not introduce new colours or fonts casually.
- Portal navigation is `src/components/portal/portal-nav.tsx` (top bar on desktop, bottom bar and a More menu on phones) and `pupil-tabs.tsx`. Add a page to the menu in `portal-shell.tsx`, and give a new pupil section a tab in the pupil layout.
- Links inside the portal use `PendingLink` so they show progress. Every portal route group needs a `loading.tsx` so navigation shows a skeleton straight away. Entrance effects are the `stagger` and `rise` classes in `globals.css`, which are off for reduced motion.
- Phones: no horizontal scroll, ever. Give a grid its columns with `grid-cols-*`, put wide tables in an `overflow-x-auto` wrapper, keep button labels short, and size dialogs to `dvh`, not `vh`. Form controls are at least 16px, or iOS zooms the page when they are focused.
- Accessibility matters here: keep the skip link, visible focus rings, alt text, and reduced-motion support. Layouts must work at phone width with no sideways page scroll.
- Prefer clear names and simple code. Comment only where the reason is not obvious.
- Preview deployments must not send form submissions or emails to real people. Leave `FORMS_WEBHOOK_URL`, `RESEND_API_KEY` and `EMAIL_FROM` unset outside Production.
- Uploads go straight to Blob from the browser, past Vercel's 4.5 MB request limit. Job application uploads still go through a server action and must stay under that limit.
