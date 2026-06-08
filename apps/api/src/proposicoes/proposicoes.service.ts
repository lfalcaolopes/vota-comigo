import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  MaisVotadasResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
} from '@vota-comigo/shared-types';

import { selectVotacaoReferencia } from '@/matcher/votacao-referencia';

import { toProposicaoCard } from './mappers/proposicao-card.mapper';
import { toProposicaoDetalhe } from './mappers/proposicao-detalhe.mapper';
import {
  PROPOSICOES_REPOSITORY,
  type ProposicoesRepository,
} from './proposicoes.repository';
import { toProposicoesComputaveis } from './rules/proposicoes-computaveis';
import { compareRanking } from './rules/proposicoes-ranking';
import {
  compareSearchRelevance,
  matchesAllTokens,
  referenceMatchCount,
  tokenizeQuery,
  toSearchableProposicao,
} from './rules/proposicoes-search';

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
    const ranked = [...toProposicoesComputaveis(rows)].sort(compareRanking);

    return {
      items: ranked.slice(offset, offset + limit).map(toProposicaoCard),
      total: ranked.length,
      limit,
      offset,
    };
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
    const tokens = tokenizeQuery(query);

    const matched = toProposicoesComputaveis(rows)
      .flatMap((ranked) => {
        const fields = toSearchableProposicao(ranked.proposicao);
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
