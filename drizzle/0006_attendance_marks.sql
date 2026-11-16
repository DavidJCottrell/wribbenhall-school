CREATE TABLE "attendance_mark" (
	"child_id" uuid NOT NULL,
	"mark_date" date NOT NULL,
	"session" text NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"recorded_by" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_mark_child_id_mark_date_session_pk" PRIMARY KEY("child_id","mark_date","session"),
	CONSTRAINT "attendance_mark_session_check" CHECK ("attendance_mark"."session" in ('am', 'pm'))
);
--> statement-breakpoint
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_mark_date_idx" ON "attendance_mark" USING btree ("mark_date");