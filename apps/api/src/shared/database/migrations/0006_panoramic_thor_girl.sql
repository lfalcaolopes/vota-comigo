CREATE TABLE "votacao_votos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"votacao_id" uuid NOT NULL,
	"external_id_votacao" text NOT NULL,
	"votos_json" jsonb NOT NULL,
	"votos_sim" integer NOT NULL,
	"votos_nao" integer NOT NULL,
	"votos_abstencao" integer NOT NULL,
	"votos_obstrucao" integer NOT NULL,
	"votos_artigo_17" integer NOT NULL,
	"votos_nao_informado" integer NOT NULL,
	CONSTRAINT "votacao_votos_external_id_votacao_unique" UNIQUE("external_id_votacao")
);
--> statement-breakpoint
ALTER TABLE "votacao_votos" ADD CONSTRAINT "votacao_votos_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacao"("id") ON DELETE no action ON UPDATE no action;