import { Inject, Injectable } from '@nestjs/common';

import type {
  MaisVotadasResponse,
  ProposicaoCard,
  ProposicoesSearchResponse,
} from '@vota-comigo/shared-types';

import {
  interpretResultado,
  selectVotacaoReferencia,
} from '@/matcher/votacao-referencia';
import type {
  VotacaoCandidate,
  ClassifiedVotacao,
} from '@/matcher/votacao-referencia';
import {
  PROPOSICOES_REPOSITORY,
  type ProposicaoVotacaoJoinRow,
  type ProposicoesRepository,
} from './proposicoes.repository';
import {
  matchesAllTokens,
  normalizeText,
  referenceMatchCount,
  tokenizeQuery,
  type SearchableProposicao,
} from './proposicoes-search';

type ProposicaoWithVotacoes = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
  votacoesPlenario: readonly VotacaoCandidate[];
};

type RankedProposicao = {
  proposicao: ProposicaoWithVotacoes;
  volumeVotacoesPlenario: number;
  referencia: ClassifiedVotacao;
};

@Injectable()
export class ProposicoesService {
  constructor(
    @Inject(PROPOSICOES_REPOSITORY)
    private readonly repository: ProposicoesRepository,
  ) {}

  async maisVotadas(
    limit: number,
    offset: number,
  ): Promise<MaisVotadasResponse> {
    const rows = await this.repository.loadProposicoesWithVotacoesPlenario();
    const ranked = [...toComputaveis(rows)].sort(compareRanking);

    return {
      items: ranked.slice(offset, offset + limit).map(toProposicaoCard),
      total: ranked.length,
      limit,
      offset,
    };
  }

  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<ProposicoesSearchResponse> {
    const rows = await this.repository.loadProposicoesWithVotacoesPlenario();
    const tokens = tokenizeQuery(query);

    const matched = toComputaveis(rows)
      .flatMap((ranked) => {
        const fields = toSearchable(ranked.proposicao);
        if (!matchesAllTokens(fields, tokens)) {
          return [];
        }
        return [{ ranked, refMatches: referenceMatchCount(fields, tokens) }];
      })
      .sort(compareSearchRelevance);

    return {
      items: matched
        .slice(offset, offset + limit)
        .map((entry) => toProposicaoCard(entry.ranked)),
      total: matched.length,
      limit,
      offset,
      query,
    };
  }
}

type SearchMatch = {
  ranked: RankedProposicao;
  refMatches: number;
};

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
        ultimoStatusSiglaOrgao: row.ultimoStatusSiglaOrgao,
        ultimoStatusDescricaoSituacao: row.ultimoStatusDescricaoSituacao,
        ultimoStatusRegime: row.ultimoStatusRegime,
        ultimoStatusDataHora: row.ultimoStatusDataHora,
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

function compareRanking(a: RankedProposicao, b: RankedProposicao): number {
  if (a.volumeVotacoesPlenario !== b.volumeVotacoesPlenario) {
    return b.volumeVotacoesPlenario - a.volumeVotacoesPlenario;
  }
  const anoA = a.proposicao.ano ?? Number.NEGATIVE_INFINITY;
  const anoB = b.proposicao.ano ?? Number.NEGATIVE_INFINITY;
  if (anoA !== anoB) return anoB - anoA;

  const numeroA = a.proposicao.numero ?? Number.NEGATIVE_INFINITY;
  const numeroB = b.proposicao.numero ?? Number.NEGATIVE_INFINITY;
  if (numeroA !== numeroB) return numeroB - numeroA;

  const siglaA = a.proposicao.siglaTipo ?? '';
  const siglaB = b.proposicao.siglaTipo ?? '';
  if (siglaA !== siglaB) return siglaA < siglaB ? -1 : 1;

  return a.proposicao.externalIdProposicao - b.proposicao.externalIdProposicao;
}

function toComputaveis(
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
        volumeVotacoesPlenario: proposicao.votacoesPlenario.length,
        referencia,
      },
    ];
  });
}

function toSearchable(
  proposicao: ProposicaoWithVotacoes,
): SearchableProposicao {
  return {
    ementa: normalizeText(proposicao.ementa ?? ''),
    siglaTipo: normalizeText(proposicao.siglaTipo ?? ''),
    numero: proposicao.numero === null ? '' : String(proposicao.numero),
    ano: proposicao.ano === null ? '' : String(proposicao.ano),
  };
}

function compareSearchRelevance(a: SearchMatch, b: SearchMatch): number {
  if (a.refMatches !== b.refMatches) {
    return b.refMatches - a.refMatches;
  }
  return compareRanking(a.ranked, b.ranked);
}

function toProposicaoCard(ranked: RankedProposicao): ProposicaoCard {
  const { proposicao, referencia } = ranked;
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    status: {
      siglaOrgao: proposicao.ultimoStatusSiglaOrgao,
      situacao: proposicao.ultimoStatusDescricaoSituacao,
      regime: proposicao.ultimoStatusRegime,
      dataHora: proposicao.ultimoStatusDataHora,
    },
    volumeVotacoesPlenario: ranked.volumeVotacoesPlenario,
    votacaoReferencia: {
      externalIdVotacao: referencia.externalIdVotacao,
      data: referencia.data,
      descricao: referencia.descricao,
      pattern: referencia.classification.pattern,
      votosSim: referencia.votosSim ?? 0,
      votosNao: referencia.votosNao ?? 0,
      votosOutros: referencia.votosOutros ?? 0,
      resultado: interpretResultado(referencia.aprovacao),
    },
  };
}
