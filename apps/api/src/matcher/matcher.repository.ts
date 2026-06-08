import { and, eq, inArray } from 'drizzle-orm';

import { toProposicoesComputaveis } from '@/proposicoes/rules/proposicoes-computaveis';
import type { ProposicaoVotacaoJoinRow } from '@/proposicoes/proposicoes.repository';
import type { DrizzleDatabase } from '@/shared/database/client';
import {
  proposicao,
  votacao,
  votacaoProposicao,
} from '@/shared/database/schema';

export const MATCHER_REPOSITORY = Symbol('MATCHER_REPOSITORY');

export type MatcherRepository = {
  loadComputaveisExternalIds(
    externalIds: readonly number[],
  ): Promise<ReadonlySet<number>>;
};

export function createMatcherRepository(
  db: DrizzleDatabase,
): MatcherRepository {
  return {
    async loadComputaveisExternalIds(externalIds) {
      if (externalIds.length === 0) {
        return new Set<number>();
      }

      const rows: ProposicaoVotacaoJoinRow[] = await db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          siglaTipo: proposicao.siglaTipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao:
            proposicao.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: proposicao.ultimoStatusRegime,
          ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
          externalIdVotacao: votacao.externalIdVotacao,
          data: votacao.data,
          dataHoraRegistro: votacao.dataHoraRegistro,
          descricao: votacao.descricao,
          ultimaAberturaVotacaoDescricao:
            votacao.ultimaAberturaVotacaoDescricao,
          ultimaApresentacaoProposicaoDescricao:
            votacao.ultimaApresentacaoProposicaoDescricao,
          votosSim: votacao.votosSim,
          votosNao: votacao.votosNao,
          votosOutros: votacao.votosOutros,
          aprovacao: votacao.aprovacao,
        })
        .from(votacaoProposicao)
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .innerJoin(
          proposicao,
          eq(votacaoProposicao.proposicaoId, proposicao.id),
        )
        .where(
          and(
            eq(votacao.escopoVotacao, 'plenario'),
            inArray(proposicao.externalIdProposicao, [...externalIds]),
          ),
        );

      return new Set(
        toProposicoesComputaveis(rows).map(
          (ranked) => ranked.proposicao.externalIdProposicao,
        ),
      );
    },
  };
}
