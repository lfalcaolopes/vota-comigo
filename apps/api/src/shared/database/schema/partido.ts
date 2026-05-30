import { bigint, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const partido = pgTable('partido', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdPartido: bigint('external_id_partido', { mode: 'number' })
    .notNull()
    .unique(),
  sigla: text('sigla'),
  uri: text('uri'),
});
