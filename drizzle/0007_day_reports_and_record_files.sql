CREATE TABLE "day_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"author_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"report_date" date NOT NULL,
	"session" text,
	"subject" text,
	"visible_to_parents" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_report_session_check" CHECK ("day_report"."session" is null or "day_report"."session" in ('morning', 'afternoon', 'all_day'))
);
--> statement-breakpoint
CREATE TABLE "record_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"day_report_id" uuid,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "record_file_pathname_unique" UNIQUE("pathname"),
	CONSTRAINT "record_file_one_owner_check" CHECK (num_nonnulls("record_file"."day_report_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "day_report" ADD CONSTRAINT "day_report_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_report" ADD CONSTRAINT "day_report_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_day_report_id_day_report_id_fk" FOREIGN KEY ("day_report_id") REFERENCES "public"."day_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_file" ADD CONSTRAINT "record_file_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "day_report_child_id_report_date_idx" ON "day_report" USING btree ("child_id","report_date");--> statement-breakpoint
CREATE INDEX "record_file_child_id_idx" ON "record_file" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "record_file_day_report_id_idx" ON "record_file" USING btree ("day_report_id");--> statement-breakpoint
INSERT INTO "day_report" ("id", "child_id", "author_id", "title", "body", "report_date", "visible_to_parents", "created_at", "updated_at")
SELECT "id", "child_id", "author_id", "title", "body", "occurred_on", "visible_to_parents", "created_at", "created_at" FROM "child_update";--> statement-breakpoint
INSERT INTO "record_file" ("id", "child_id", "day_report_id", "pathname", "filename", "content_type", "size_bytes", "created_at")
SELECT a."id", u."child_id", a."update_id", a."pathname", a."filename", a."content_type", a."size_bytes", a."created_at"
FROM "child_update_attachment" a JOIN "child_update" u ON u."id" = a."update_id";
