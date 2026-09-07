import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const matcherStart = pgTable(
  'matcher_start',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmContent: text('utm_content'),
    referrer: text('referrer'),
    startedAt: timestamp('started_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('matcher_start_started_at_idx').on(table.startedAt)],
);
