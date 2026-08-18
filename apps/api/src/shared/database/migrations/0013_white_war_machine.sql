CREATE TABLE "deputado_gasto_cota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"gastos_json" jsonb NOT NULL,
	CONSTRAINT "deputado_gasto_cota_deputado_id_year_unique" UNIQUE("deputado_id","year")
);
--> statement-breakpoint
CREATE TABLE "cota_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_num_sub_cota" integer NOT NULL,
	"descricao" text NOT NULL,
	CONSTRAINT "cota_categoria_external_num_sub_cota_unique" UNIQUE("external_num_sub_cota")
);
--> statement-breakpoint
CREATE TABLE "cota_cobertura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"covered_through_month" integer NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cota_cobertura_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "deputado_gasto_cota" ADD CONSTRAINT "deputado_gasto_cota_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;