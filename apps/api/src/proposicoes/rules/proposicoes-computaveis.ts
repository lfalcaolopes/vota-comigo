import {
  selectVotacaoReferencia,
  type VotacaoCandidate,
} from '@/matcher/rules/votacao-referencia';

import type { ProposicaoVotacaoJoinRow } from '../proposicoes.repository';
import type {
  ProposicaoWithVotacoes,
  RankedProposicao,
} from '../types/proposicoes.types';

function maxDate(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((max, value) => {
    if (value === null) {
      return max;
    }
    return max === null || value > max ? value : max;
  }, null);
}

function toCandidate(row: ProposicaoVotacaoJoinRow): VotacaoCandidate {
  return {
    externalIdVotacao: row.externalIdVotacao,
    data: row.data,
    dataHoraRegistro: row.dataHoraRegistro,
    descricao: row.descricao,
    ultimaAberturaVotacaoDescricao: row.ultimaAberturaVotacaoDescricao,
    ultimaApresentacaoProposicaoDescricao:
      row.ultimaApresentacaoProposicaoDescricao,
    votosSim: row.votosSim,
    votosNao: row.votosNao,
    votosOutros: row.votosOutros,
    aprovacao: row.aprovacao,
  };
}

function groupByProposicao(
  rows: readonly ProposicaoVotacaoJoinRow[],
): readonly ProposicaoWithVotacoes[] {
  const byId = new Map<number, ProposicaoWithVotacoes>();

  for (const row of rows) {
    const existing = byId.get(row.externalIdProposicao);
    if (existing === undefined) {
      byId.set(row.externalIdProposicao, {
        externalIdProposicao: row.externalIdProposicao,
        siglaTipo: row.siglaTipo,
        numero: row.numero,
        ano: row.ano,
        ementa: row.ementa,
        descricaoTipo: row.descricaoTipo,
        ementaDetalhada: row.ementaDetalhada,
        keywords: row.keywords,
        dataApresentacao: row.dataApresentacao,
        ultimoStatusSiglaOrgao: row.ultimoStatusSiglaOrgao,
        ultimoStatusDescricaoSituacao: row.ultimoStatusDescricaoSituacao,
        ultimoStatusRegime: row.ultimoStatusRegime,
        ultimoStatusDataHora: row.ultimoStatusDataHora,
        resumoIa: row.resumoIa,
        votacoesPlenario: [toCandidate(row)],
      });
    } else {
      byId.set(row.externalIdProposicao, {
        ...existing,
        votacoesPlenario: [...existing.votacoesPlenario, toCandidate(row)],
      });
    }
  }

  return [...byId.values()];
}

export function toProposicoesComputaveis(
  rows: readonly ProposicaoVotacaoJoinRow[],
): readonly RankedProposicao[] {
  return groupByProposicao(rows).flatMap((proposicao) => {
    const referencia = selectVotacaoReferencia(proposicao.votacoesPlenario);
    if (referencia === null) {
      return [];
    }
    return [
      {
        proposicao,
        resumoIa: proposicao.resumoIa,
        volumeVotacoesPlenario: proposicao.votacoesPlenario.length,
        dataUltimaVotacao: maxDate(
          proposicao.votacoesPlenario.map((votacao) => votacao.data),
        ),
        referencia,
      },
    ];
  });
}
