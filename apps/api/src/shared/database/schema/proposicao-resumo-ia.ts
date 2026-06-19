import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { proposicao } from './proposicao';

export const proposicaoResumoIa = pgTable(
  'proposicao_resumo_ia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id),
    sourceHash: text('source_hash').notNull(),
    generationStatus: text('generation_status').notNull(),
    reviewStatus: text('review_status').notNull(),
    resumoCard: text('resumo_card'),
    resumoDetalhe: text('resumo_detalhe'),
    model: text('model'),
    promptVersion: text('prompt_version'),
    generatedAt: timestamp('generated_at', {
      withTimezone: true,
      mode: 'string',
    }),
    reviewedAt: timestamp('reviewed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    importedAt: timestamp('imported_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('proposicao_resumo_ia_proposicao_id_unique').on(table.proposicaoId),
  ],
);
