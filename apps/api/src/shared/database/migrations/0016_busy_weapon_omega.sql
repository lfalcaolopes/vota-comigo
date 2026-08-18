CREATE TABLE "orgao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_orgao" bigint NOT NULL,
	"uri" text,
	"sigla" text,
	"apelido" text,
	"nome" text,
	"nome_publicacao" text,
	"external_cod_tipo_orgao" integer,
	"tipo_orgao" text,
	"casa" text,
	CONSTRAINT "orgao_external_id_orgao_unique" UNIQUE("external_id_orgao")
);
--> statement-breakpoint
CREATE TABLE "deputado_orgao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"orgao_id" uuid NOT NULL,
	"legislatura_id" uuid NOT NULL,
	"cargo" text,
	"data_inicio" date NOT NULL,
	"data_fim" date
);
--> statement-breakpoint
ALTER TABLE "deputado_orgao" ADD CONSTRAINT "deputado_orgao_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado_orgao" ADD CONSTRAINT "deputado_orgao_orgao_id_orgao_id_fk" FOREIGN KEY ("orgao_id") REFERENCES "public"."orgao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado_orgao" ADD CONSTRAINT "deputado_orgao_legislatura_id_legislatura_id_fk" FOREIGN KEY ("legislatura_id") REFERENCES "public"."legislatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deputado_orgao_deputado_id_idx" ON "deputado_orgao" USING btree ("deputado_id");