import { bigint, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { proposicao } from './proposicao';
import { votacao } from './votacao';

export const votacaoProposicao = pgTable(
  'votacao_proposicao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalIdVotacao: text('external_id_votacao').notNull(),
    externalIdProposicao: bigint('external_id_proposicao', {
      mode: 'number',
    }).notNull(),
    votacaoId: uuid('votacao_id').references(() => votacao.id),
    proposicaoId: uuid('proposicao_id').references(() => proposicao.id),
  },
  (table) => [
    unique('votacao_proposicao_external_unique').on(
      table.externalIdVotacao,
      table.externalIdProposicao,
    ),
  ],
);
