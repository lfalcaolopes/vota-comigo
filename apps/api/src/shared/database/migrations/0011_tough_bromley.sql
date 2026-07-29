CREATE TABLE "matcher_completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_selecionadas" integer NOT NULL,
	"total_respondidas" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "matcher_completion_completed_at_idx" ON "matcher_completion" USING btree ("completed_at");