DROP INDEX "deputado_historico_deputado_data_idx";--> statement-breakpoint
CREATE INDEX "votacao_votos_votacao_id_idx" ON "votacao_votos" USING btree ("votacao_id");--> statement-breakpoint
CREATE INDEX "proposicao_computavel_votacao_referencia_id_idx" ON "proposicao_computavel" USING btree ("votacao_referencia_id");--> statement-breakpoint
CREATE INDEX "votacao_proposicao_external_id_proposicao_idx" ON "votacao_proposicao" USING btree ("external_id_proposicao");--> statement-breakpoint
CREATE INDEX "votacao_proposicao_votacao_id_idx" ON "votacao_proposicao" USING btree ("votacao_id");--> statement-breakpoint
CREATE INDEX "proposicao_tema_proposicao_id_idx" ON "proposicao_tema" USING btree ("proposicao_id");--> statement-breakpoint
CREATE INDEX "deputado_historico_deputado_data_idx" ON "deputado_historico" USING btree ("deputado_id","data_hora" DESC NULLS LAST,"nome_eleitoral","sigla_uf","url_foto","partido_id");