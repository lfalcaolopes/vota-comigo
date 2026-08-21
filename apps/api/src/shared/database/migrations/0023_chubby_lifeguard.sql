CREATE TABLE "deputado_cota_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"status" text NOT NULL,
	"motivo" text,
	"legislatura" integer,
	"percentual_teto_base" double precision,
	"gasto_cents" bigint,
	"teto_base_cents" bigint,
	"cobertura_ate" date,
	"referencia" date NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deputado_cota_uso_deputado_id_unique" UNIQUE("deputado_id")
);
--> statement-breakpoint
ALTER TABLE "deputado_cota_uso" ADD CONSTRAINT "deputado_cota_uso_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deputado_cota_uso_ordenacao_idx" ON "deputado_cota_uso" USING btree ("status","percentual_teto_base");