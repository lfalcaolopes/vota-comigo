import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { votacaoProposicao } from '@/shared/database/schema';
import type {
  VotacaoProposicaoRepository,
  VotacaoProposicaoRow,
  VotacaoProposicaoUpsertResult,
} from './votacao-proposicao.repository.types';

export function createVotacaoProposicaoRepository(
  db: DrizzleDatabase,
): VotacaoProposicaoRepository {
  return {
    async upsert(rows): Promise<VotacaoProposicaoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(votacaoProposicao)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: [
            votacaoProposicao.externalIdVotacao,
            votacaoProposicao.externalIdProposicao,
          ],
          set: {
            votacaoId: sql`excluded.votacao_id`,
            proposicaoId: sql`excluded.proposicao_id`,
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

function toValues(
  row: VotacaoProposicaoRow,
): typeof votacaoProposicao.$inferInsert {
  return {
    externalIdVotacao: row.externalIdVotacao,
    externalIdProposicao: row.externalIdProposicao,
    votacaoId: row.votacaoId,
    proposicaoId: row.proposicaoId,
  };
}
