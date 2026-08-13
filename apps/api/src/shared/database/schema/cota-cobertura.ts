import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cotaCobertura = pgTable('cota_cobertura', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  coveredThroughMonth: integer('covered_through_month').notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});
