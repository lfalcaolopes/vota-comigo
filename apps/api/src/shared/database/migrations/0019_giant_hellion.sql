CREATE TABLE "deputado_gasto_cota_sigepa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"gastos_json" jsonb NOT NULL,
	CONSTRAINT "deputado_gasto_cota_sigepa_deputado_id_year_unique" UNIQUE("deputado_id","year")
);
--> statement-breakpoint
ALTER TABLE "cota_cobertura" ADD COLUMN "sigepa_reposto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cota_cobertura" ADD COLUMN "sigepa_covered_through_month" integer;--> statement-breakpoint
ALTER TABLE "deputado_gasto_cota_sigepa" ADD CONSTRAINT "deputado_gasto_cota_sigepa_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;