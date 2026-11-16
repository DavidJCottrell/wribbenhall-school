# Wribbenhall School website

The public website for Wribbenhall School in Bewdley, plus a private portal where staff keep pupil records and parents see their own child's information.

Next.js (App Router, Cache Components), React, Tailwind CSS 4 and shadcn/ui. The portal uses Better Auth, Drizzle with Neon Postgres, and Vercel Blob. Deployed on Vercel from this repository, where `main` is the live site.

## Run it on your laptop

You need Node.js 22 or later.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. The public site works with no configuration. The portal (`/login` and `/portal`) also needs a database and a few settings: copy `.env.example` to `.env.local`, fill in what it lists, then see "Database" in `CLAUDE.md`.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

These also run on every pull request.

## More

- `CLAUDE.md` is the main guide: the workflow for changes, how the site connects to Vercel, Neon, Blob, Resend and the rest, the database, and conventions.
- `docs/portal-roadmap.md` is where the portal rebuild stands and what comes next.
- `docs/site-notes.md` covers the public site: pages, editing content, forms, and the notes from importing the old site.
- `.env.example` lists every setting.
