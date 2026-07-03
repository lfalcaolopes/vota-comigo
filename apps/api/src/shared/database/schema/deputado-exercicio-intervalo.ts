import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

export const deputadoExercicioIntervalo = pgTable(
  'deputado_exercicio_intervalo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    openedAt: timestamp('opened_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
    ruleVersion: integer('rule_version').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('deputado_exercicio_intervalo_deputado_id_idx').on(table.deputadoId),
  ],
);
