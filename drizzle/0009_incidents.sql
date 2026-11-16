CREATE TABLE "incident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"created_by" text,
	"occurred_on" date NOT NULL,
	"occurred_time" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"location" text,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"antecedent" text,
	"behaviour" text,
	"response" text,
	"outcome" text,
	"injury" text,
	"first_aid" text,
	"intervention_technique" text,
	"intervention_minutes" integer,
	"intervention_staff" text,
	"intervention_debrief" text,
	"parents_informed_on" date,
	"parents_informed_by" text,
	"parents_informed_how" text,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"share_with_parents" boolean DEFAULT false NOT NULL,
	"parent_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "incident_type_check" CHECK ("incident"."type" in ('behaviour', 'accident_injury', 'physical_intervention', 'bullying', 'other')),
	CONSTRAINT "incident_severity_check" CHECK ("incident"."severity" in ('low', 'medium', 'high')),
	CONSTRAINT "incident_status_check" CHECK ("incident"."status" in ('open', 'under_review', 'closed')),
	CONSTRAINT "incident_intervention_minutes_check" CHECK ("incident"."intervention_minutes" is null or "incident"."intervention_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "incident_pupil" (
	"incident_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "incident_pupil_incident_id_child_id_pk" PRIMARY KEY("incident_id","child_id"),
	CONSTRAINT "incident_pupil_role_check" CHECK ("incident_pupil"."role" in ('involved', 'witness'))
);
--> statement-breakpoint
ALTER TABLE "record_file" DROP CONSTRAINT "record_file_one_owner_check";--> statement-breakpoint
ALTER TABLE "record_file" ADD COLUMN "incident_id" uuid;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_pupil" ADD CONSTRAINT "incident_pupil_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_pupil" ADD CONSTRAINT "incident_pupil_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_child_id_occurred_on_idx" ON "incident" USING btree ("child_id","occurred_on");--> statement-breakpoint
CREATE INDEX "incident_status_idx" ON "incident" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incident_pupil_child_id_idx" ON "incident_pupil" USING btree ("child_id");--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "record_file_incident_id_idx" ON "record_file" USING btree ("incident_id");--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_one_owner_check" CHECK (num_nonnulls("record_file"."day_report_id", "record_file"."incident_id") = 1);