CREATE TABLE "proposicao_computavel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"votacao_referencia_id" uuid NOT NULL,
	"votacao_referencia_pattern" text NOT NULL,
	"volume_votacoes_plenario" integer NOT NULL,
	"data_ultima_votacao" date,
	"rule_version" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposicao_computavel_proposicao_id_unique" UNIQUE("proposicao_id")
);
--> statement-breakpoint
ALTER TABLE "proposicao_computavel" ADD CONSTRAINT "proposicao_computavel_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicao_computavel" ADD CONSTRAINT "proposicao_computavel_votacao_referencia_id_votacao_id_fk" FOREIGN KEY ("votacao_referencia_id") REFERENCES "public"."votacao"("id") ON DELETE no action ON UPDATE no action;