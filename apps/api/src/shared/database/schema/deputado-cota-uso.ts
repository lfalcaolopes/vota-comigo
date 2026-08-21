import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

export const deputadoCotaUso = pgTable(
  'deputado_cota_uso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    status: text('status').notNull(),
    motivo: text('motivo'),
    legislatura: integer('legislatura'),
    percentualTetoBase: doublePrecision('percentual_teto_base'),
    gastoCents: bigint('gasto_cents', { mode: 'number' }),
    tetoBaseCents: bigint('teto_base_cents', { mode: 'number' }),
    periodStart: date('period_start'),
    diasEmExercicio: integer('dias_em_exercicio'),
    coberturaAte: date('cobertura_ate'),
    referencia: date('referencia').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('deputado_cota_uso_deputado_id_unique').on(table.deputadoId),
    index('deputado_cota_uso_ordenacao_idx').on(
      table.status,
      table.percentualTetoBase,
    ),
  ],
);
