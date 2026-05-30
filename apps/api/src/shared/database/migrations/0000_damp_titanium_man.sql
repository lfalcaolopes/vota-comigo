CREATE TABLE "legislatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_legislatura" smallint NOT NULL,
	"uri" text,
	"data_inicio" date,
	"data_fim" date,
	"ano_eleicao" smallint,
	CONSTRAINT "legislatura_external_id_legislatura_unique" UNIQUE("external_id_legislatura")
);
