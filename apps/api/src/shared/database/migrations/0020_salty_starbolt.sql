CREATE TABLE "deputado_cota_comparacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"legislatura" integer NOT NULL,
	"status" text NOT NULL,
	"motivo" text,
	"percentual_sobre_mediana_uf" double precision,
	"gasto_na_comparacao_cents" bigint,
	"sigla_uf" text,
	"anos_na_comparacao" integer,
	"dias_em_exercicio" integer,
	"dias_na_comparacao" integer,
	"anos_json" jsonb NOT NULL,
	"referencia" date NOT NULL,
	CONSTRAINT "deputado_cota_comparacao_deputado_id_unique" UNIQUE("deputado_id")
);
--> statement-breakpoint
ALTER TABLE "deputado_cota_comparacao" ADD CONSTRAINT "deputado_cota_comparacao_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deputado_cota_comparacao_percentual_idx" ON "deputado_cota_comparacao" USING btree ("percentual_sobre_mediana_uf");