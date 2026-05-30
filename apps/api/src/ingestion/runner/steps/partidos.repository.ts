import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { partido } from '@/shared/database/schema';
import type {
  PartidoRepository,
  PartidoRow,
  PartidoUpsertResult,
} from './partidos.repository.types';

export function createPartidoRepository(
  db: DrizzleDatabase,
): PartidoRepository {
  return {
    async upsert(rows): Promise<PartidoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(partido)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: partido.externalIdPartido,
          set: {
            sigla: sql`excluded.sigla`,
            uri: sql`excluded.uri`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;

      return {
        inserted,
        updated: result.length - inserted,
      };
    },
  };
}

function toValues(row: PartidoRow): typeof partido.$inferInsert {
  return {
    externalIdPartido: row.externalIdPartido,
    sigla: row.sigla,
    uri: row.uri,
  };
}
