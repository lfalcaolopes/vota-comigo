import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { legislatura } from '@/shared/database/schema';
import type {
  LegislaturaRepository,
  LegislaturaRow,
  LegislaturaUpsertResult,
} from './legislaturas.repository.types';

export function createLegislaturaRepository(
  db: DrizzleDatabase,
): LegislaturaRepository {
  return {
    async upsert(rows): Promise<LegislaturaUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(legislatura)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: legislatura.externalIdLegislatura,
          set: {
            uri: sql`excluded.uri`,
            dataInicio: sql`excluded.data_inicio`,
            dataFim: sql`excluded.data_fim`,
            anoEleicao: sql`excluded.ano_eleicao`,
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

function toValues(row: LegislaturaRow): typeof legislatura.$inferInsert {
  return {
    externalIdLegislatura: row.externalIdLegislatura,
    uri: row.uri,
    dataInicio: row.dataInicio,
    dataFim: row.dataFim,
    anoEleicao: row.anoEleicao,
  };
}
