CREATE TABLE "proposicao_tipo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sigla_tipo" text NOT NULL,
	"descricao_tipo" text,
	"external_cod_tipo" bigint,
	CONSTRAINT "proposicao_tipo_sigla_tipo_unique" UNIQUE("sigla_tipo")
);
--> statement-breakpoint
CREATE TABLE "deputado_proposicao_assinada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"assinaturas_json" jsonb NOT NULL,
	"composicao_json" jsonb NOT NULL,
	CONSTRAINT "deputado_proposicao_assinada_deputado_id_year_unique" UNIQUE("deputado_id","year")
);
--> statement-breakpoint
ALTER TABLE "deputado_proposicao_assinada" ADD CONSTRAINT "deputado_proposicao_assinada_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;