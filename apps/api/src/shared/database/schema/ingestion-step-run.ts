import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Dado operacional puro: uma linha por passo, sobrescrita a cada execução, para
// comparar cargas em SQL. Não entra no contrato público nem é exibido ao usuário.
export const ingestionStepRun = pgTable(
  'ingestion_step_run',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stepName: text('step_name').notNull(),
    executedAt: timestamp('executed_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    recordsRead: integer('records_read').notNull(),
    // Nulos em passo `single`: o runner não sabe quais anos o passo varreu.
    firstYear: integer('first_year'),
    lastYear: integer('last_year'),
  },
  (table) => [unique('ingestion_step_run_step_name_unique').on(table.stepName)],
);
