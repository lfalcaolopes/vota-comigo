import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const apuracaoSnapshot = pgTable(
  'apuracao_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalCdEleicao: text('external_cd_eleicao').notNull(),
    urnasStep: integer('urnas_step').notNull(),
    urnasApuradas: doublePrecision('urnas_apuradas').notNull(),
    numeroA: text('numero_a').notNull(),
    numeroB: text('numero_b').notNull(),
    oficialShareA: doublePrecision('oficial_share_a').notNull(),
    projecaoShareA: doublePrecision('projecao_share_a').notNull(),
    tseUpdatedAt: text('tse_updated_at').notNull(),
    source: text('source').notNull(),
    capturedAt: timestamp('captured_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('apuracao_snapshot_eleicao_step_unique').on(
      table.externalCdEleicao,
      table.urnasStep,
    ),
  ],
);
