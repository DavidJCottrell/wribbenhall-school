@AGENTS.md

# Wribbenhall School website

Public website for Wribbenhall School, a special education school in Bewdley. Next.js App Router with Cache Components, Tailwind CSS 4, shadcn/ui. Deployed on Vercel from this repo.

## Git workflow

- `main` is production. Every merge to `main` goes live on the school's real site.
- Never commit or push to `main`, and never force-push.
- Work on a branch named `claude/<short-description>`, for example `claude/update-term-dates`.
- Push the branch and open a pull request. Vercel builds a preview for each PR; mention what to look at in the PR description.
- Keep each PR to one change so it is easy to review and revert.
- Do not merge your own PRs. The owner reviews the preview and merges.
- Pull the latest changes before starting. The owner also edits from a laptop.

## Before pushing

Run all three and fix anything they report:

```bash
npm run lint
npm run typecheck
npm run build
```

## Project layout

- `src/app` routes and server actions (`src/app/actions/forms.ts`)
- `src/components` UI, grouped by area (`site`, `home`, `calendar`, `gallery`, `policies`, `contact`, `vacancies`, `forms`, `ui`)
- `src/content/*.json` all site content (school details, events, policies, gallery, vacancies)
- `src/lib/content` content providers and zod schemas
- `src/lib/forms/schemas.ts` form schemas shared by client and server
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
- Forms use react-hook-form with zod. Reuse the shared schema on both client and server and keep the honeypot field.
- Use existing shadcn components in `src/components/ui` before adding new ones.
- Keep the established design: Severn palette tokens and fonts from `globals.css`. Do not introduce new colours or fonts casually.
- Accessibility matters here: keep the skip link, visible focus rings, alt text, and reduced-motion support.
- Prefer clear names and simple code. Comment only where the reason is not obvious.

## Environment

- Variables are listed in `.env.example`. Never commit real values or `.env*` files.
- Preview deployments must not send form submissions to the school. Leave `FORMS_WEBHOOK_URL` unset outside Production.
- Job application uploads must stay under Vercel's 4.5 MB request limit.