import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const matcherCompletion = pgTable(
  'matcher_completion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    totalSelecionadas: integer('total_selecionadas').notNull(),
    totalRespondidas: integer('total_respondidas').notNull(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('matcher_completion_completed_at_idx').on(table.completedAt),
  ],
);
