CREATE TABLE "deputado_presenca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"presencas" integer NOT NULL,
	"ausencias_sem_motivo_conhecido" integer NOT NULL,
	"fora_de_exercicio" integer NOT NULL,
	"lacuna_de_dados" integer NOT NULL,
	"rule_version" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deputado_presenca_deputado_id_unique" UNIQUE("deputado_id")
);
--> statement-breakpoint
ALTER TABLE "deputado_presenca" ADD CONSTRAINT "deputado_presenca_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;