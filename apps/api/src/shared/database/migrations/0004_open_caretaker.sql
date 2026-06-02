CREATE TABLE "proposicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_proposicao" bigint NOT NULL,
	"uri" text,
	"sigla_tipo" text,
	"numero" integer,
	"ano" integer,
	"external_cod_tipo" bigint,
	"descricao_tipo" text,
	"ementa" text,
	"ementa_detalhada" text,
	"keywords" text,
	"data_apresentacao" timestamp with time zone,
	"url_inteiro_teor" text,
	"ultimo_status_data_hora" timestamp with time zone,
	"ultimo_status_sigla_orgao" text,
	"ultimo_status_regime" text,
	"ultimo_status_descricao_situacao" text,
	CONSTRAINT "proposicao_external_id_proposicao_unique" UNIQUE("external_id_proposicao")
);
--> statement-breakpoint
CREATE TABLE "votacao_proposicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_votacao" text NOT NULL,
	"external_id_proposicao" bigint NOT NULL,
	"votacao_id" uuid,
	"proposicao_id" uuid,
	CONSTRAINT "votacao_proposicao_external_unique" UNIQUE("external_id_votacao","external_id_proposicao")
);
--> statement-breakpoint
ALTER TABLE "votacao_proposicao" ADD CONSTRAINT "votacao_proposicao_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacao_proposicao" ADD CONSTRAINT "votacao_proposicao_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE no action ON UPDATE no action;