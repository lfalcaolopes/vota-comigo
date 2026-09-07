CREATE TABLE "matcher_start" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"referrer" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matcher_completion" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "matcher_completion" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "matcher_completion" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "matcher_completion" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "matcher_completion" ADD COLUMN "referrer" text;--> statement-breakpoint
CREATE INDEX "matcher_start_started_at_idx" ON "matcher_start" USING btree ("started_at");