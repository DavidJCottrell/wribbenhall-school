CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"subject" text NOT NULL,
	"subject_id" text,
	"child_id" uuid,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pupil_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text,
	"email" text,
	"parental_responsibility" boolean DEFAULT false NOT NULL,
	"emergency_contact" boolean DEFAULT false NOT NULL,
	"authorised_to_collect" boolean DEFAULT false NOT NULL,
	"notes" text,
	"linked_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "preferred_name" text;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "admission_date" date;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "leaving_date" date;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "key_worker_id" text;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "ehcp_status" text;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "local_authority" text;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "ehcp_review_due" date;--> statement-breakpoint
ALTER TABLE "child" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "permissions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pupil_contact" ADD CONSTRAINT "pupil_contact_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pupil_contact" ADD CONSTRAINT "pupil_contact_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_at_idx" ON "audit_event" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_event_child_id_at_idx" ON "audit_event" USING btree ("child_id","at");--> statement-breakpoint
CREATE INDEX "audit_event_user_id_at_idx" ON "audit_event" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "pupil_contact_child_id_idx" ON "pupil_contact" USING btree ("child_id");--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "child_key_worker_id_user_id_fk" FOREIGN KEY ("key_worker_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Administrators become staff holding every permission, so the head teacher is both staff and administrator.
UPDATE "user" SET "role" = 'staff', "permissions" = ARRAY['users.manage','pupils.manage','audit.view','attendance.record','attendance.manage','reports.write','reports.manage','incidents.view','incidents.record','incidents.review','medical.view','medical.record','medical.manage'] WHERE "role" = 'admin';
--> statement-breakpoint
-- Existing staff keep what they could do before: write reports and edit their own.
UPDATE "user" SET "permissions" = ARRAY['reports.write'] WHERE "role" = 'staff' AND cardinality("permissions") = 0;
