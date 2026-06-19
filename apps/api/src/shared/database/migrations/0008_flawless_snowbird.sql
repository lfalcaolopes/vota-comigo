CREATE TABLE "proposicao_resumo_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"source_hash" text NOT NULL,
	"generation_status" text NOT NULL,
	"review_status" text NOT NULL,
	"resumo_card" text,
	"resumo_detalhe" text,
	"model" text,
	"prompt_version" text,
	"generated_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposicao_resumo_ia_proposicao_id_unique" UNIQUE("proposicao_id")
);
--> statement-breakpoint
ALTER TABLE "proposicao_resumo_ia" ADD CONSTRAINT "proposicao_resumo_ia_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE no action ON UPDATE no action;