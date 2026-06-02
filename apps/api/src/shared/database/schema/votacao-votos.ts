import { integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { votacao } from './votacao';

export const votacaoVotos = pgTable('votacao_votos', {
  id: uuid('id').primaryKey().defaultRandom(),
  votacaoId: uuid('votacao_id')
    .notNull()
    .references(() => votacao.id),
  externalIdVotacao: text('external_id_votacao').notNull().unique(),
  votosJson: jsonb('votos_json').notNull(),
  votosSim: integer('votos_sim').notNull(),
  votosNao: integer('votos_nao').notNull(),
  votosAbstencao: integer('votos_abstencao').notNull(),
  votosObstrucao: integer('votos_obstrucao').notNull(),
  votosArtigo17: integer('votos_artigo_17').notNull(),
  votosNaoInformado: integer('votos_nao_informado').notNull(),
});
