ALTER TABLE "child_update" DROP CONSTRAINT "child_update_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "child_update" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "child_update" ADD CONSTRAINT "child_update_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;