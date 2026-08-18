import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

import { proposicao } from './proposicao';

export const PROPOSICAO_EMBEDDING_DIM = 1536;

export const proposicaoEmbedding = pgTable(
  'proposicao_embedding',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id),
    sourceHash: text('source_hash').notNull(),
    embedding: vector('embedding', {
      dimensions: PROPOSICAO_EMBEDDING_DIM,
    }).notNull(),
    model: text('model').notNull(),
    dim: integer('dim').notNull(),
    generatedAt: timestamp('generated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('proposicao_embedding_proposicao_id_unique').on(table.proposicaoId),
  ],
);
