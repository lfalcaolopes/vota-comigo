-- A UF de um gasto só existe no arquivo anual da cota, linha a linha: nenhuma
-- linha já carregada tem como recebê-la. Como a carga é substituição anual
-- completa e o CSV continua disponível, os anos são reingeridos.
DELETE FROM "deputado_gasto_cota";--> statement-breakpoint
DELETE FROM "cota_cobertura";--> statement-breakpoint
CREATE TABLE "cota_mediana_uf" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"sigla_uf" text NOT NULL,
	"valor_utilizado_mediana" bigint NOT NULL,
	"deputado_count" integer NOT NULL,
	CONSTRAINT "cota_mediana_uf_year_sigla_uf_unique" UNIQUE("year","sigla_uf")
);
--> statement-breakpoint
ALTER TABLE "deputado_gasto_cota" ADD COLUMN "sigla_uf" text NOT NULL;