CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "proposicao_embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"source_hash" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" text NOT NULL,
	"dim" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposicao_embedding_proposicao_id_unique" UNIQUE("proposicao_id")
);
--> statement-breakpoint
ALTER TABLE "proposicao_embedding" ADD CONSTRAINT "proposicao_embedding_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE no action ON UPDATE no action;