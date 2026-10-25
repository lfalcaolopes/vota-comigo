CREATE TABLE "apuracao_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_cd_eleicao" text NOT NULL,
	"urnas_step" integer NOT NULL,
	"urnas_apuradas" double precision NOT NULL,
	"numero_a" text NOT NULL,
	"numero_b" text NOT NULL,
	"oficial_share_a" double precision NOT NULL,
	"projecao_share_a" double precision NOT NULL,
	"tse_updated_at" text NOT NULL,
	"source" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apuracao_snapshot_eleicao_step_unique" UNIQUE("external_cd_eleicao","urnas_step")
);
