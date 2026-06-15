import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  FeedOrdenacao,
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
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
import { selectComparator } from './rules/proposicoes-ranking';
import { toTemasDisponiveis } from './rules/temas-disponiveis';
import { filterProposicoesByQuery } from './rules/proposicoes-search';

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
    q?: string,
  ): Promise<ProposicoesFeedResponse> {
    const rows =
      await this.repository.loadProposicoesWithVotacoesPlenario(tema);
    const computaveis = toProposicoesComputaveis(rows);
    const filtered =
      q !== undefined && q.trim().length > 0
        ? filterProposicoesByQuery(computaveis, q.trim())
        : computaveis;
    const ranked = [...filtered].sort(selectComparator(ordenacao));

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
}
