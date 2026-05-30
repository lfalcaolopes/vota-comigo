CREATE TABLE "partido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_partido" bigint NOT NULL,
	"sigla" text,
	"uri" text,
	CONSTRAINT "partido_external_id_partido_unique" UNIQUE("external_id_partido")
);
--> statement-breakpoint
CREATE TABLE "deputado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_deputado" bigint NOT NULL,
	"uri" text,
	"nome" text,
	"nome_civil" text,
	"sigla_sexo" char(1),
	"data_nascimento" date,
	"data_falecimento" date,
	"uf_nascimento" char(2),
	"municipio_nascimento" text,
	"url_rede_social" text,
	"url_website" text,
	"legislatura_inicial_id" uuid,
	"legislatura_final_id" uuid,
	CONSTRAINT "deputado_external_id_deputado_unique" UNIQUE("external_id_deputado")
);
--> statement-breakpoint
ALTER TABLE "deputado" ADD CONSTRAINT "deputado_legislatura_inicial_id_legislatura_id_fk" FOREIGN KEY ("legislatura_inicial_id") REFERENCES "public"."legislatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado" ADD CONSTRAINT "deputado_legislatura_final_id_legislatura_id_fk" FOREIGN KEY ("legislatura_final_id") REFERENCES "public"."legislatura"("id") ON DELETE no action ON UPDATE no action;