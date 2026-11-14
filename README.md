# Wribbenhall School website

Next.js 16 (App Router), React 19, Tailwind CSS 4 and shadcn/ui.

All names, phone numbers, addresses, dates, policies, jobs and pictures are **placeholder content**. Replace them before the site goes anywhere public.

## Run it on your laptop

You need Node.js 20.9 or later (22 LTS recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To try the production build:

```bash
npm run build
npm start
```

Form submissions are printed in the terminal running the server, so you can see exactly what each form sends.

## Pages

| Path | What's there |
| --- | --- |
| `/` | Hero, upcoming events, headteacher's welcome, learning pathways, quick links |
| `/calendar` | Month view with category filters, event list, term dates, `.ics` downloads |
| `/gallery` | Albums with a keyboard-friendly lightbox |
| `/policies` | Searchable, filterable document list with downloads |
| `/vacancies` and `/vacancies/[slug]` | Job listings, job detail and an online application with CV upload |
| `/contact` | Office details, enquiry form, and a four-step application for a pupil place (`/contact#apply` opens it directly) |

## Where things live

```
src/
  content/            Placeholder data as JSON, one file per collection
  lib/content/        Content layer: schemas, providers, cached getters
  lib/media.ts        Turns media keys into URLs (local or CDN)
  lib/forms/          Form schemas (shared by browser and server) and delivery
  app/actions/        Server actions that validate and deliver form submissions
  components/ui/      shadcn/ui components
  components/site/    Header, footer, page header, logo
  components/...      Feature components per page
public/media/         Placeholder images and PDFs
scripts/              Generator for the placeholder images and PDFs
```

## Editing content

Edit the JSON files in `src/content`. Each one is validated against the schemas in `src/lib/content/schema.ts` when the site builds, so a typo in a date or a missing field fails loudly rather than showing a broken page.

Images and documents are referenced by **key**, a path relative to the media root, for example `gallery/harvest/01.jpg`. Locally that resolves to `public/media/gallery/harvest/01.jpg`.

## Moving to a CDN or CMS

Nothing in the pages knows where content comes from, so switching is configuration rather than a rewrite. Copy `.env.example` to `.env.local` and set what you need.

**Media on a CDN.** Upload the contents of `public/media` to your bucket (S3, Cloudflare R2, Azure Blob, Bunny and so on) keeping the same folder structure, then set:

```
NEXT_PUBLIC_MEDIA_BASE_URL=https://cdn.example.com/wribbenhall/media
```

`next.config.ts` adds that host to the image allowlist automatically. If your CDN resizes images itself (Cloudinary, imgix), add a custom `images.loaderFile`; `mediaUrl()` in `src/lib/media.ts` is the one place keys become URLs.

**Content from a CDN.** Publish the six JSON files (same names and shapes as `src/content`) and set:

```
CONTENT_BASE_URL=https://cdn.example.com/wribbenhall/content
```

**A headless CMS.** Write a provider that implements `ContentProvider` (`src/lib/content/provider.ts`), map the CMS response into the existing schemas, and return it from `resolveProvider()` in `src/lib/content/index.ts`.

Content is cached for an hour using Next.js Cache Components. Each collection is tagged with its name (`events`, `policies`, ...), so a CMS webhook can call `revalidateTag("events")` from a route handler to publish changes immediately.

## Forms

Each form has one Zod schema in `src/lib/forms/schemas.ts`, used for instant feedback in the browser and checked again on the server. Submissions go through `getFormDelivery()` in `src/lib/forms/delivery.ts`:

- With no configuration, they're printed in the terminal.
- Set `FORMS_WEBHOOK_URL` to POST each submission as JSON (Power Automate, Zapier, Make or your own API). CV uploads are included as base64.
- To send email or write to a database, add another `FormDelivery` implementation in the same file.

Every form has a hidden honeypot field to catch simple spam bots. For a public launch, consider adding rate limiting or a CAPTCHA such as Cloudflare Turnstile.

## Adding shadcn/ui components

`components.json` is set up, so this works as normal:

```bash
npx shadcn@latest add accordion
```

## Placeholder images and PDFs

`scripts/generate-placeholders.py` draws the illustrated placeholders and writes the dummy PDFs (needs Python 3 with Pillow, NumPy and ReportLab). You won't need it once real photos and documents are in place.

## Before going live

- Replace all placeholder content, especially contact details, the safeguarding text and term dates
- Get consent for every photo of a pupil
- Check statutory publishing requirements for maintained schools on GOV.UK
- Add a privacy notice page and link the enquiry form's consent checkbox to it
- Set up form delivery and test that messages arrive
