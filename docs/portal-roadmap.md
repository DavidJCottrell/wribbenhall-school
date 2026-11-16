# Portal roadmap

The portal is being rebuilt from a simple "updates" feed into a structured pupil records system that replaces the school's existing admin software. This file records the decisions made, what is built, and what comes next, so work can continue from any session. How the services connect is in `CLAUDE.md`.

## The school

A small independent specialist school, 10 to 15 pupils, ages 5 to 18, for children with social, emotional and mental health needs who are too anxious to attend other schools (anxiety, school phobia and school refusal, autism, depression, self-harm). It uses the Thrive Approach. That is why attendance and wellbeing matter more here than in an ordinary school, and why risk and medical records need particular care.

## Decisions

- **Privileges are individual permissions per person**, not fixed roles. A login is a parent or staff. An administrator ticks what each member of staff may do, and presets (Head teacher, Teacher, Learning support assistant, Office) tick boxes as a starting point. The head teacher holds every permission, so is both staff and administrator. The catalogue is `src/lib/auth/permissions.ts`.
- **All staff see all pupils.** Sensitive records are limited by permission, not by assignment. Each pupil has an informational key worker.
- **Every member of staff can always** see the pupil list, basic profiles, contacts, daily reports and the register, with no permission needed. To be confirmed with the school: whether medical alerts such as anaphylaxis should also be visible to all staff.
- **Parents** see only their own children, and only what is marked for them. Parent pages are built from separate queries that select only parent-safe fields.
- **Everything is audited**: who viewed or changed profiles, contacts, permissions, reports and the register.
- **Real data waits.** This is special category data about children. Nothing real goes in until the school's data protection lead has signed off: privacy notice, a data protection impact assessment, retention periods and lawful basis.

## Status

| Stage | What | State |
| --- | --- | --- |
| 1. Foundations | Permissions, pupil profiles and contacts, key worker, pupil dashboard, parent view, audit log, unit tests and CI | Built and merged (PR #18) |
| 2. Attendance | Daily register (morning and afternoon, DfE-style codes, notes, closing a day), editing windows by permission, parent and staff attendance charts, staff home panel | Built and merged (PR #19) |
| 3. Daily reports | Updates became daily reports (date, optional part of the day and subject), shown day by day beside that day's attendance. One `record_file` table for files | Built, in review |
| 4. Incidents | Incident records with review and a parent summary | Planned |
| 5. Medical | Conditions, medication, administration log | Planned |

Production steps for each stage (migrations, settings) were listed in its PR. Migrations `0004` to `0006` (and `0007` and `0008` for stage 3) must be on the Production database for the merged stages to work. Confirm they have been run.

## What's planned

**Stage 3, daily reports (built).** `day_report` replaced `child_update`, and `record_file` replaced `child_update_attachment`, with data copied by migration `0007` and the old tables dropped by `0008`. Files belong to a record through a nullable cascading key, so incidents and medical conditions add their own column and a purpose in `src/app/api/portal/uploads/route.ts`. The nightly cleanup checks `record_file`.

**Stage 4, incidents.** Types: behaviour, accident or injury, physical intervention, bullying, other. Fields: when, where, severity, a summary, a description, and what led up to it, what the pupil did and how staff responded. Injury and first aid. Physical intervention details (technique, minutes, staff, debrief). Whether and how parents were informed. Status (open, under review, closed), reviewed by, and sign-off. Other pupils involved are recorded but never shown to parents. Parents see only a staff-written summary, and only when it has been shared. Proposed: sharing needs the review permission.

**Stage 5, medical.** Conditions, allergies and dietary needs, with severity, signs, action plan, and an alert flag. Medication with dose, route, times, as-required limits, prescriber, expiry and parental consent. An append-only administration log: given, refused, missed or not needed, with who gave it and who witnessed. Mistakes are voided with a reason, never edited. A due-today view, a printable emergency summary, and a read-only parent view. This records administration. It is not a safety-critical dispensing system, so run it alongside paper records until the school is confident.

**Later, once the school has used these:** progress and SEN (EHCP outcomes, targets, termly reviews, wellbeing check-ins), documents and consents (EHCP, reports, permission slips, photo consent), safeguarding concerns restricted to the designated lead, a communication log, exports (subject access requests, census, attendance certificates), email notifications to parents, and importing from the current software.

**Out of scope:** staff HR and the single central record, fees, timetable, admissions pipeline, premises logs.

## To confirm with the school

- Do the attendance codes match its current register? How should part-day attendance for pupils returning gradually be recorded?
- What should daily reports capture? This is deliberately generic for now.
- Who may share an incident summary with parents? Should parents see the medication log?
- Which records, and which fields, does the school actually need? Check against its own policies and inspector expectations.
- The data protection steps above.

## Conventions for new records

- A migration, a data access module in `src/lib/portal/`, parent-safe queries where parents see anything, and server actions guarded by `getActionUser()`.
- An audit entry for every write, and for views of sensitive pages.
- Fixtures in `scripts/db/fixtures.mts` for any new table, then `npm run db:generate-reset-sql`.
- Permission matrix checks in `tests/e2e/permissions.mjs` for each new page and action, including direct calls by people who must be refused, and a check that nothing staff-only reaches a parent.
- Pure logic in `src/lib/<module>/` with unit tests. Charts follow the rules in `CLAUDE.md`.
