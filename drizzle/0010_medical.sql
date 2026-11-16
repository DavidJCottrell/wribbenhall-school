CREATE TABLE "medical_condition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"severity" text NOT NULL,
	"signs" text,
	"action_plan" text,
	"alert" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"visible_to_parents" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_condition_kind_check" CHECK ("medical_condition"."kind" in ('condition', 'allergy', 'dietary', 'other')),
	CONSTRAINT "medical_condition_severity_check" CHECK ("medical_condition"."severity" in ('mild', 'moderate', 'severe'))
);
--> statement-breakpoint
CREATE TABLE "medication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dose" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text,
	"scheduled_times" text[] DEFAULT '{}' NOT NULL,
	"as_required" boolean DEFAULT false NOT NULL,
	"max_daily_doses" integer,
	"prescriber" text,
	"starts_on" date,
	"expires_on" date,
	"storage" text,
	"consent_on" date,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medication_route_check" CHECK ("medication"."route" in ('oral', 'inhaled', 'topical', 'injection', 'eye_drops', 'other')),
	CONSTRAINT "medication_max_daily_doses_check" CHECK ("medication"."max_daily_doses" is null or "medication"."max_daily_doses" > 0)
);
--> statement-breakpoint
CREATE TABLE "medication_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"occurred_time" text NOT NULL,
	"scheduled_for" text,
	"outcome" text NOT NULL,
	"dose" text,
	"given_by" text,
	"given_by_name" text NOT NULL,
	"witnessed_by" text,
	"witnessed_by_name" text,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"voided_at" timestamp,
	"voided_by" text,
	"voided_by_name" text,
	"void_reason" text,
	CONSTRAINT "medication_log_outcome_check" CHECK ("medication_log"."outcome" in ('given', 'refused', 'missed', 'not_needed')),
	CONSTRAINT "medication_log_void_check" CHECK (("medication_log"."voided_at" is null) = ("medication_log"."void_reason" is null))
);
--> statement-breakpoint
ALTER TABLE "record_file" DROP CONSTRAINT "record_file_one_owner_check";--> statement-breakpoint
ALTER TABLE "record_file" ADD COLUMN "medical_condition_id" uuid;--> statement-breakpoint
ALTER TABLE "medical_condition" ADD CONSTRAINT "medical_condition_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_condition" ADD CONSTRAINT "medical_condition_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication" ADD CONSTRAINT "medication_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication" ADD CONSTRAINT "medication_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_medication_id_medication_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_given_by_user_id_fk" FOREIGN KEY ("given_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_witnessed_by_user_id_fk" FOREIGN KEY ("witnessed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medical_condition_child_id_idx" ON "medical_condition" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "medication_child_id_idx" ON "medication" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "medication_log_medication_id_occurred_on_idx" ON "medication_log" USING btree ("medication_id","occurred_on");--> statement-breakpoint
CREATE INDEX "medication_log_child_id_occurred_on_idx" ON "medication_log" USING btree ("child_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_log_scheduled_dose_idx" ON "medication_log" USING btree ("medication_id","occurred_on","scheduled_for") WHERE "medication_log"."scheduled_for" is not null and "medication_log"."voided_at" is null;--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_medical_condition_id_medical_condition_id_fk" FOREIGN KEY ("medical_condition_id") REFERENCES "public"."medical_condition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "record_file_medical_condition_id_idx" ON "record_file" USING btree ("medical_condition_id");--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_one_owner_check" CHECK (num_nonnulls("record_file"."day_report_id", "record_file"."incident_id", "record_file"."medical_condition_id") = 1);