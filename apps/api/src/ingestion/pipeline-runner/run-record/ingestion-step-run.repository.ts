import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { ingestionStepRun } from '@/shared/database/schema';

import type { IngestionStepRunRow } from './ingestion-step-run';
import type { IngestionStepRunRepository } from './ingestion-step-run.repository.types';

export function createIngestionStepRunRepository(
  db: DrizzleDatabase,
): IngestionStepRunRepository {
  return {
    async upsert(rows) {
      if (rows.length === 0) {
        return;
      }

      await db
        .insert(ingestionStepRun)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: ingestionStepRun.stepName,
          set: {
            executedAt: sql`excluded.executed_at`,
            recordsRead: sql`excluded.records_read`,
            firstYear: sql`excluded.first_year`,
            lastYear: sql`excluded.last_year`,
          },
        });
    },
  };
}

function toValues(
  row: IngestionStepRunRow,
): typeof ingestionStepRun.$inferInsert {
  return {
    stepName: row.stepName,
    executedAt: row.executedAt,
    recordsRead: row.recordsRead,
    firstYear: row.firstYear,
    lastYear: row.lastYear,
  };
}
