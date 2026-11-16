-- Wipes a TEST database and fills it with fresh fictional data.
-- Run it in the Neon SQL Editor, on the branch you want to refresh. It does not touch uploaded files.
-- Every login below has the password: dev-password-12345

-- Stops it running on a database that holds real logins.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "user" WHERE lower(email) NOT LIKE '%@example.test') THEN
    RAISE EXCEPTION 'Refusing to wipe: this database has logins that are not @example.test addresses.';
  END IF;
END $$;

-- App data only. The migration history is left alone.
TRUNCATE TABLE
  "child_update_attachment", "child_update", "guardianship", "staff_assignment",
  "child", "session", "account", "verification", "rate_limit", "user"
CASCADE;

INSERT INTO "user" (id, name, email, email_verified, role, must_change_password, banned) VALUES
  ('seed-admin',        'Robin Admin',  'admin@example.test',        false, 'admin',  false, false),
  ('seed-staff-alex',   'Alex Teacher', 'staff@example.test',        false, 'staff',  false, false),
  ('seed-staff-jo',     'Jo Support',   'staff2@example.test',       false, 'staff',  false, false),
  ('seed-parent-pat',   'Pat Example',  'parent@example.test',       false, 'parent', false, false),
  ('seed-parent-sam',   'Sam Sample',   'other-parent@example.test', false, 'parent', false, false),
  ('seed-parent-chris', 'Chris Carer',  'carer@example.test',        false, 'parent', false, false);

-- Email and password logins. The password is a scrypt hash of dev-password-12345.
INSERT INTO "account" (id, account_id, provider_id, user_id, password)
SELECT 'account-' || id, id, 'credential', id,
       '8e334d0e0e99aa027d23a2f2274e09db:c7668b1585c0ec14df44322d62b371992f7c4d42d8209a36b48947698c61bbed66e2059f52eef38324438661c5db6db38f3d7854df458a79fb8493cec9e9323e'
FROM "user";

INSERT INTO "child" (id, first_name, last_name, year_group) VALUES
  ('11111111-1111-4111-8111-111111111111', 'River',  'Example', 'Year 4'),
  ('22222222-2222-4222-8222-222222222222', 'Oak',    'Example', 'Year 7'),
  ('33333333-3333-4333-8333-333333333333', 'Ash',    'Sample',  'Year 2'),
  ('44444444-4444-4444-8444-444444444444', 'Willow', 'Brook',   'Year 10');

INSERT INTO "guardianship" (user_id, child_id, relationship) VALUES
  ('seed-parent-pat',   '11111111-1111-4111-8111-111111111111', 'Parent'),
  ('seed-parent-pat',   '22222222-2222-4222-8222-222222222222', 'Parent'),
  ('seed-parent-sam',   '33333333-3333-4333-8333-333333333333', 'Carer'),
  ('seed-parent-chris', '44444444-4444-4444-8444-444444444444', 'Grandparent');

INSERT INTO "staff_assignment" (user_id, child_id) VALUES
  ('seed-staff-alex', '11111111-1111-4111-8111-111111111111'),
  ('seed-staff-alex', '33333333-3333-4333-8333-333333333333'),
  ('seed-staff-jo',   '22222222-2222-4222-8222-222222222222'),
  ('seed-staff-jo',   '44444444-4444-4444-8444-444444444444'),
  ('seed-staff-jo',   '11111111-1111-4111-8111-111111111111');

INSERT INTO "child_update" (child_id, author_id, title, body, occurred_on, visible_to_parents) VALUES
  ('11111111-1111-4111-8111-111111111111', 'seed-staff-alex', 'Reading together',              'This is fictional text for development.', current_date - 1, true),
  ('11111111-1111-4111-8111-111111111111', 'seed-staff-jo',   'Staff note: sensory break',     'This is fictional text for development.', current_date - 3, false),
  ('11111111-1111-4111-8111-111111111111', 'seed-staff-alex', 'Swimming session',              E'This is fictional text for development.\nA second line, to check line breaks.', current_date - 8, true),
  ('22222222-2222-4222-8222-222222222222', 'seed-staff-jo',   'Art project',                   'This is fictional text for development.', current_date - 2, true),
  ('22222222-2222-4222-8222-222222222222', 'seed-staff-jo',   'Staff note: lunchtime routine', 'This is fictional text for development.', current_date - 6, false),
  ('33333333-3333-4333-8333-333333333333', 'seed-staff-alex', 'Garden visit',                  'This is fictional text for development.', current_date - 4, true),
  ('44444444-4444-4444-8444-444444444444', 'seed-staff-jo',   'Work experience planning',      'This is fictional text for development.', current_date - 5, true);
