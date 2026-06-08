import type { DrizzleDatabase } from '@/shared/database/client';
import { proposicao, votacao } from '@/shared/database/schema';
import type {
  ProposicaoLookup,
  VotacaoLookup,
} from './votacao-proposicao.repository.types';

export function createVotacaoLookup(db: DrizzleDatabase): VotacaoLookup {
  return {
    async loadIdByExternalId(): Promise<ReadonlyMap<string, string>> {
      const rows = await db
        .select({ externalId: votacao.externalIdVotacao, id: votacao.id })
        .from(votacao);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },
  };
}

export function createProposicaoLookup(db: DrizzleDatabase): ProposicaoLookup {
  return {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      const rows = await db
        .select({
          externalId: proposicao.externalIdProposicao,
          id: proposicao.id,
        })
        .from(proposicao);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },
  };
}
