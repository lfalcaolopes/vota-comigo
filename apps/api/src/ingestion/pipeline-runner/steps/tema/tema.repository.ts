import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { proposicaoTema, tema } from '@/shared/database/schema';
import type {
  ProposicaoTemaRow,
  TemaRepository,
  TemaRow,
  UpsertResult,
} from './tema.repository.types';

export function createTemaRepository(db: DrizzleDatabase): TemaRepository {
  return {
    async upsertTemas(rows): Promise<UpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(tema)
        .values(rows.map(toTemaValues))
        .onConflictDoUpdate({
          target: tema.externalCodTema,
          set: { tema: sql`excluded.tema` },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      return toUpsertResult(result);
    },

    async upsertVinculos(rows): Promise<UpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(proposicaoTema)
        .values(rows.map(toVinculoValues))
        .onConflictDoUpdate({
          target: [
            proposicaoTema.externalIdProposicao,
            proposicaoTema.externalCodTema,
          ],
          set: {
            proposicaoId: sql`excluded.proposicao_id`,
            temaId: sql`excluded.tema_id`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      return toUpsertResult(result);
    },
  };
}

function toUpsertResult(
  result: readonly { inserted: boolean }[],
): UpsertResult {
  const inserted = result.filter((row) => row.inserted).length;

  return {
    inserted,
    updated: result.length - inserted,
  };
}

function toTemaValues(row: TemaRow): typeof tema.$inferInsert {
  return {
    externalCodTema: row.externalCodTema,
    tema: row.tema,
  };
}

function toVinculoValues(
  row: ProposicaoTemaRow,
): typeof proposicaoTema.$inferInsert {
  return {
    externalIdProposicao: row.externalIdProposicao,
    externalCodTema: row.externalCodTema,
    proposicaoId: row.proposicaoId,
    temaId: row.temaId,
  };
}
