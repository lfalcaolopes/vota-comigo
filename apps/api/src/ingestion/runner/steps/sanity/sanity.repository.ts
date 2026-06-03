import { eq } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { votacao, votacaoVotos } from '@/shared/database/schema';
import type {
  PlacarComparisonRow,
  SanityRepository,
} from './sanity.repository.types';

export function createSanityRepository(db: DrizzleDatabase): SanityRepository {
  return {
    async loadPlacares(): Promise<readonly PlacarComparisonRow[]> {
      const rows = await db
        .select({
          externalIdVotacao: votacao.externalIdVotacao,
          votosSimOficial: votacao.votosSim,
          votosNaoOficial: votacao.votosNao,
          votosSimDerivado: votacaoVotos.votosSim,
          votosNaoDerivado: votacaoVotos.votosNao,
          abstencao: votacaoVotos.votosAbstencao,
          obstrucao: votacaoVotos.votosObstrucao,
          artigo17: votacaoVotos.votosArtigo17,
          naoInformado: votacaoVotos.votosNaoInformado,
        })
        .from(votacaoVotos)
        .innerJoin(votacao, eq(votacaoVotos.votacaoId, votacao.id));

      return rows.map((row) => ({
        externalIdVotacao: row.externalIdVotacao,
        votosSimOficial: row.votosSimOficial,
        votosNaoOficial: row.votosNaoOficial,
        votosSimDerivado: row.votosSimDerivado,
        votosNaoDerivado: row.votosNaoDerivado,
        outrosDerivado: {
          abstencao: row.abstencao,
          obstrucao: row.obstrucao,
          artigo17: row.artigo17,
          naoInformado: row.naoInformado,
        },
      }));
    },
  };
}
