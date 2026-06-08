import { eq } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  proposicao,
  votacao,
  votacaoProposicao,
} from '@/shared/database/schema';

export const PROPOSICOES_REPOSITORY = Symbol('PROPOSICOES_REPOSITORY');

export type ProposicaoVotacaoJoinRow = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
  externalIdVotacao: string;
  data: string | null;
  dataHoraRegistro: string | null;
  descricao: string | null;
  ultimaAberturaVotacaoDescricao: string | null;
  ultimaApresentacaoProposicaoDescricao: string | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  aprovacao: number | null;
};

export type ProposicoesRepository = {
  loadProposicoesWithVotacoesPlenario(): Promise<
    readonly ProposicaoVotacaoJoinRow[]
  >;
};

export function createProposicoesRepository(
  db: DrizzleDatabase,
): ProposicoesRepository {
  return {
    async loadProposicoesWithVotacoesPlenario() {
      return db
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
        .where(eq(votacao.escopoVotacao, 'plenario'));
    },
  };
}
