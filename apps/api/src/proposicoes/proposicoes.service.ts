import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  FeedOrdenacao,
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
  TemasDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { selectVotacaoReferencia } from '@/matcher/rules/votacao-referencia';

import { toProposicaoCard } from './mappers/proposicao-card.mapper';
import { toProposicaoDetalhe } from './mappers/proposicao-detalhe.mapper';
import {
  PROPOSICOES_REPOSITORY,
  type ProposicoesRepository,
} from './proposicoes.repository';
import { toProposicoesComputaveis } from './rules/proposicoes-computaveis';
import { compareRanking, selectComparator } from './rules/proposicoes-ranking';
import { toTemasDisponiveis } from './rules/temas-disponiveis';
import {
  compareSearchRelevance,
  matchesCitation,
  matchesAllTokens,
  parseCitation,
  referenceMatchCount,
  tokenizeQuery,
  toSearchableProposicao,
} from './rules/proposicoes-search';
import type { RankedProposicao } from './types/proposicoes.types';

@Injectable()
export class ProposicoesService {
  constructor(
    @Inject(PROPOSICOES_REPOSITORY)
    private readonly repository: ProposicoesRepository,
  ) {}

  async feed(
    limit: number,
    offset: number,
    ordenacao: FeedOrdenacao = 'mais-votadas',
    tema?: number,
  ): Promise<ProposicoesFeedResponse> {
    const rows =
      await this.repository.loadProposicoesWithVotacoesPlenario(tema);
    const ranked = [...toProposicoesComputaveis(rows)].sort(
      selectComparator(ordenacao),
    );

    return {
      items: ranked.slice(offset, offset + limit).map(toProposicaoCard),
      total: ranked.length,
      limit,
      offset,
    };
  }

  async temasDisponiveis(): Promise<TemasDisponiveisResponse> {
    const [rows, temaRows] = await Promise.all([
      this.repository.loadProposicoesWithVotacoesPlenario(),
      this.repository.loadProposicaoTemas(),
    ]);
    const computaveis = toProposicoesComputaveis(rows);
    const computableIds = new Set(
      computaveis.map((r) => r.proposicao.externalIdProposicao),
    );
    return { items: [...toTemasDisponiveis(temaRows, computableIds)] };
  }

  async detalhe(externalIdProposicao: number): Promise<ProposicaoDetalhe> {
    const result =
      await this.repository.loadProposicaoDetalhe(externalIdProposicao);
    if (result === null) {
      throw new NotFoundException('proposicao nao encontrada');
    }

    const referencia = selectVotacaoReferencia(result.votacoes);
    if (referencia === null) {
      throw new NotFoundException('proposicao nao computavel pelo matcher');
    }

    return toProposicaoDetalhe(result, referencia.externalIdVotacao);
  }

  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<ProposicoesSearchResponse> {
    const rows = await this.repository.loadProposicoesWithVotacoesPlenario();
    const computaveis = toProposicoesComputaveis(rows);

    const citation = parseCitation(query);
    if (citation !== null) {
      const exact = computaveis
        .filter((r) =>
          matchesCitation(toSearchableProposicao(r.proposicao), citation),
        )
        .sort(compareRanking);
      return this.buildSearchResponse(exact, query, limit, offset);
    }

    const tokens = tokenizeQuery(query);
    const matched = computaveis
      .flatMap((ranked) => {
        const fields = toSearchableProposicao(ranked.proposicao);
        if (!matchesAllTokens(fields, tokens)) return [];
        return [{ ranked, refMatches: referenceMatchCount(fields, tokens) }];
      })
      .sort(compareSearchRelevance);

    return this.buildSearchResponse(
      matched.map((m) => m.ranked),
      query,
      limit,
      offset,
    );
  }

  private buildSearchResponse(
    ranked: readonly RankedProposicao[],
    query: string,
    limit: number,
    offset: number,
  ): ProposicoesSearchResponse {
    return {
      items: ranked.slice(offset, offset + limit).map(toProposicaoCard),
      total: ranked.length,
      limit,
      offset,
      query,
    };
  }
}
