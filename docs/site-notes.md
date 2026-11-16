# Website notes

Detail about the public site that used to live in the README: what's on each page, how content and media are managed, how forms are delivered, and what to check from the November 2026 import of the old site. The setup, services and portal are covered in `CLAUDE.md` and `docs/portal-roadmap.md`.

Content was imported from the old site at wribbenhallschool.co.uk in November 2026: text, staff, photos, the logo, policy links, term dates from the school's Google Calendar, and the current vacancy.

## Pages

| Path | What's there |
| --- | --- |
| `/` | Hero, upcoming dates, about the school, our school, who we can help, ISA finalists, staff, quick links |
| `/calendar` | Month view with category filters, event list, term dates, `.ics` downloads |
| `/gallery` | Albums with a keyboard-friendly lightbox |
| `/policies` | Searchable list of policies, safeguarding documents and inspection reports (`/policies#inspections`) |
| `/vacancies` and `/vacancies/[slug]` | Job listings, job detail, vacancy documents and an online application with an application form upload |
| `/contact` | Office details, enquiry form, and a four-step application for a pupil place (`/contact#apply` opens it directly) |

## Where things live

```
src/
  content/            Site content as JSON, one file per collection
  lib/content/        Content layer: schemas, providers, cached getters
  lib/media.ts        Turns media keys into URLs (local or CDN)
  lib/forms/          Form schemas (shared by browser and server) and delivery
  app/actions/        Server actions that validate and deliver form submissions
  components/ui/      shadcn/ui components
  components/site/    Header, footer, page header, logo
  components/...      Feature components per page
public/media/         Photos, staff portraits and the logo
```

## Editing content

Edit the JSON files in `src/content`. Each one is validated against the schemas in `src/lib/content/schema.ts` when the site builds, so a typo in a date or a missing field fails loudly rather than showing a broken page.

Images are referenced by **key**, a path relative to the media root, for example `gallery/our-school/01.jpg`. Locally that resolves to `public/media/gallery/our-school/01.jpg`.

Documents can be either a media key (`"key": "documents/attendance.pdf"`, served from `public/media` or your CDN) or a link (`"url": "https://drive.google.com/..."`). The policies and vacancy documents currently link to the school's Google Drive, as on the old site, so updating a file in Drive updates the website.

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

## Content imported from the old site

- **Photos** were captured from the old site at the size it served them. Some staff portraits are small (Ellis Wells is 96 pixels) and will look soft; send better originals if you have them.
- **Logo**: the header uses the tree from the school logo, cut out from its lettering. The full logo is at `public/media/site/logo.png`.
- **Policy titles** were tidied from the Drive file names. Where the old site listed the same document twice, only the most recently modified copy is kept. Both "Admissions policy" and "Admissions policy 2026" are still listed; remove whichever is out of date.
- **SEND information report** still links to the file on the old site (`/static/media/SEN_Information_Report...docx`). That link will break when the old site is replaced, so upload the report to Drive or `public/media/documents/` and update `src/content/school.json` and `src/content/policies.json`.
- **Term dates** were read from the school's Google Calendar (wribbenhallschool@gmail.com). Term start and end dates are worked out from the holidays and training days, so check them.
- **The vacancy** for a Learning Support Assistant closed on 13 November 2026, so its page shows "Applications have closed". Remove it from `src/content/vacancies.json` once it's filled.
- **The documentary video** ("Safe Spaces") on the old site wasn't copied over. It's a large video file and is best hosted on YouTube or Vimeo, then linked from the home page.

## Before going live

- Check the points under "Content imported from the old site"
- Confirm consent is still in place for every photo of a pupil
- Check statutory publishing requirements for maintained schools on GOV.UK
- Add a privacy notice page and link the enquiry form's consent checkbox to it
- Set up form delivery and test that messages arrive
