CREATE TABLE "ingestion_step_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_name" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"records_read" integer NOT NULL,
	"first_year" integer,
	"last_year" integer,
	CONSTRAINT "ingestion_step_run_step_name_unique" UNIQUE("step_name")
);
