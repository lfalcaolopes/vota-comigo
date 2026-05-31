CREATE TABLE "deputado_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deputado_id" uuid NOT NULL,
	"legislatura_id" uuid NOT NULL,
	"partido_id" uuid,
	"data_hora" timestamp with time zone NOT NULL,
	"situacao" text,
	"condicao_eleitoral" text,
	"descricao_status" text NOT NULL,
	"nome" text,
	"nome_eleitoral" text,
	"sigla_uf" char(2),
	"email" text,
	"url_foto" text,
	CONSTRAINT "deputado_historico_evento_unico" UNIQUE("deputado_id","data_hora","descricao_status")
);
--> statement-breakpoint
ALTER TABLE "deputado_historico" ADD CONSTRAINT "deputado_historico_deputado_id_deputado_id_fk" FOREIGN KEY ("deputado_id") REFERENCES "public"."deputado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado_historico" ADD CONSTRAINT "deputado_historico_legislatura_id_legislatura_id_fk" FOREIGN KEY ("legislatura_id") REFERENCES "public"."legislatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado_historico" ADD CONSTRAINT "deputado_historico_partido_id_partido_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deputado_historico_deputado_data_idx" ON "deputado_historico" USING btree ("deputado_id","data_hora" DESC NULLS LAST);