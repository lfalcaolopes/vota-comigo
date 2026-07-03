import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

export const deputadoPresenca = pgTable('deputado_presenca', {
  id: uuid('id').primaryKey().defaultRandom(),
  deputadoId: uuid('deputado_id')
    .notNull()
    .unique()
    .references(() => deputado.id),
  presencas: integer('presencas').notNull(),
  ausenciasSemMotivoConhecido: integer(
    'ausencias_sem_motivo_conhecido',
  ).notNull(),
  foraDeExercicio: integer('fora_de_exercicio').notNull(),
  lacunaDeDados: integer('lacuna_de_dados').notNull(),
  ruleVersion: integer('rule_version').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});
