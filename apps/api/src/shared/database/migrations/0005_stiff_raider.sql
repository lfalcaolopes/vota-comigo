CREATE TABLE "tema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_cod_tema" bigint NOT NULL,
	"tema" text,
	CONSTRAINT "tema_external_cod_tema_unique" UNIQUE("external_cod_tema")
);
--> statement-breakpoint
CREATE TABLE "proposicao_tema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id_proposicao" bigint NOT NULL,
	"external_cod_tema" bigint NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"tema_id" uuid NOT NULL,
	CONSTRAINT "proposicao_tema_external_unique" UNIQUE("external_id_proposicao","external_cod_tema")
);
--> statement-breakpoint
ALTER TABLE "proposicao_tema" ADD CONSTRAINT "proposicao_tema_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicao_tema" ADD CONSTRAINT "proposicao_tema_tema_id_tema_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema"("id") ON DELETE no action ON UPDATE no action;