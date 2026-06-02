import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { votacaoVotos } from '@/shared/database/schema';
import type {
  VotacaoVotosRepository,
  VotacaoVotosRow,
  VotacaoVotosUpsertResult,
} from './votacao-votos.repository.types';

export function createVotacaoVotosRepository(
  db: DrizzleDatabase,
): VotacaoVotosRepository {
  return {
    async upsert(rows): Promise<VotacaoVotosUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(votacaoVotos)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: votacaoVotos.externalIdVotacao,
          set: {
            votacaoId: sql`excluded.votacao_id`,
            votosJson: sql`excluded.votos_json`,
            votosSim: sql`excluded.votos_sim`,
            votosNao: sql`excluded.votos_nao`,
            votosAbstencao: sql`excluded.votos_abstencao`,
            votosObstrucao: sql`excluded.votos_obstrucao`,
            votosArtigo17: sql`excluded.votos_artigo_17`,
            votosNaoInformado: sql`excluded.votos_nao_informado`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      return toUpsertResult(result);
    },
  };
}

function toValues(row: VotacaoVotosRow): typeof votacaoVotos.$inferInsert {
  return {
    externalIdVotacao: row.externalIdVotacao,
    votacaoId: row.votacaoId,
    votosJson: row.votosJson,
    votosSim: row.votosSim,
    votosNao: row.votosNao,
    votosAbstencao: row.votosAbstencao,
    votosObstrucao: row.votosObstrucao,
    votosArtigo17: row.votosArtigo17,
    votosNaoInformado: row.votosNaoInformado,
  };
}

function toUpsertResult(
  result: readonly { inserted: boolean }[],
): VotacaoVotosUpsertResult {
  const inserted = result.filter((row) => row.inserted).length;

  return {
    inserted,
    updated: result.length - inserted,
  };
}
