import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const matcherCompletion = pgTable(
  'matcher_completion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    totalSelecionadas: integer('total_selecionadas').notNull(),
    totalRespondidas: integer('total_respondidas').notNull(),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmContent: text('utm_content'),
    referrer: text('referrer'),
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
