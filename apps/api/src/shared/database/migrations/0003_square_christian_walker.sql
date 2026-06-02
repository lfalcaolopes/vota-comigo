CREATE TYPE "public"."escopo_votacao" AS ENUM('plenario', 'comissao');--> statement-breakpoint
CREATE TABLE "votacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_votacao" text NOT NULL,
	"uri" text,
	"data" date,
	"data_hora_registro" timestamp with time zone,
	"external_id_orgao" bigint,
	"sigla_orgao" text,
	"escopo_votacao" "escopo_votacao" NOT NULL,
	"external_id_evento" bigint,
	"aprovacao" integer,
	"votos_sim" integer,
	"votos_nao" integer,
	"votos_outros" integer,
	"descricao" text,
	"ultima_abertura_votacao_data_hora_registro" timestamp with time zone,
	"ultima_abertura_votacao_descricao" text,
	"ultima_apresentacao_proposicao_data_hora_registro" timestamp with time zone,
	"ultima_apresentacao_proposicao_descricao" text,
	"external_id_proposicao_ultima_apresentacao" bigint,
	"uri_proposicao_ultima_apresentacao" text,
	CONSTRAINT "votacao_external_id_votacao_unique" UNIQUE("external_id_votacao")
);
