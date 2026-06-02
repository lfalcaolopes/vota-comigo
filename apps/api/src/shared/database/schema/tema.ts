import { bigint, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const tema = pgTable('tema', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalCodTema: bigint('external_cod_tema', { mode: 'number' })
    .notNull()
    .unique(),
  tema: text('tema'),
});
