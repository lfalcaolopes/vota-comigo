import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { proposicao } from './proposicao';
import { votacao } from './votacao';

export const proposicaoComputavel = pgTable('proposicao_computavel', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposicaoId: uuid('proposicao_id')
    .notNull()
    .unique()
    .references(() => proposicao.id),
  votacaoReferenciaId: uuid('votacao_referencia_id')
    .notNull()
    .references(() => votacao.id),
  votacaoReferenciaPattern: text('votacao_referencia_pattern').notNull(),
  volumeVotacoesPlenario: integer('volume_votacoes_plenario').notNull(),
  dataUltimaVotacao: date('data_ultima_votacao'),
  ruleVersion: integer('rule_version').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});
