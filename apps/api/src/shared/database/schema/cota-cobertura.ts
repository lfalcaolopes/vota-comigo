import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const cotaCobertura = pgTable('cota_cobertura', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  coveredThroughMonth: integer('covered_through_month').notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
  // Ano reposto (ADR 022): true só quando a reposição de SIGEPA cobre todos
  // os deputados elegíveis do ano. Um dump que avance sigepaCoveredThroughMonth
  // além do valor em que a reposição foi apurada devolve o ano a não reposto.
  sigepaReposto: boolean('sigepa_reposto').notNull().default(false),
  sigepaCoveredThroughMonth: integer('sigepa_covered_through_month'),
});
