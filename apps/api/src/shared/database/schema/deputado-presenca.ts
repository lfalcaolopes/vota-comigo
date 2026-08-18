import { integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';
import { legislatura } from './legislatura';

export const deputadoPresenca = pgTable(
  'deputado_presenca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    legislaturaId: uuid('legislatura_id')
      .notNull()
      .references(() => legislatura.id),
    presencas: integer('presencas').notNull(),
    ausenciasSemMotivoConhecido: integer(
      'ausencias_sem_motivo_conhecido',
    ).notNull(),
    foraDeExercicio: integer('fora_de_exercicio').notNull(),
    lacunaDeDados: integer('lacuna_de_dados').notNull(),
    ruleVersion: integer('rule_version').notNull(),
    computedAt: timestamp('computed_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('deputado_presenca_deputado_id_legislatura_id_unique').on(
      table.deputadoId,
      table.legislaturaId,
    ),
  ],
);
