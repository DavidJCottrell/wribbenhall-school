CREATE TABLE "child_update_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"update_id" uuid NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "child_update_attachment_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "child_update_attachment" ADD CONSTRAINT "child_update_attachment_update_id_child_update_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."child_update"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_update_attachment_update_id_idx" ON "child_update_attachment" USING btree ("update_id");