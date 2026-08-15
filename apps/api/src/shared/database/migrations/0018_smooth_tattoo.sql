TRUNCATE TABLE "deputado_presenca";--> statement-breakpoint
ALTER TABLE "deputado_presenca" DROP CONSTRAINT "deputado_presenca_deputado_id_unique";--> statement-breakpoint
ALTER TABLE "deputado_presenca" ADD COLUMN "legislatura_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "deputado_presenca" ADD CONSTRAINT "deputado_presenca_legislatura_id_legislatura_id_fk" FOREIGN KEY ("legislatura_id") REFERENCES "public"."legislatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deputado_presenca" ADD CONSTRAINT "deputado_presenca_deputado_id_legislatura_id_unique" UNIQUE("deputado_id","legislatura_id");