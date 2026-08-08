import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  FeedOrdenacao,
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  TemasDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toProposicaoCard } from './mappers/proposicao-card.mapper';
import { toProposicaoDetalhe } from './mappers/proposicao-detalhe.mapper';
import {
  PROPOSICOES_REPOSITORY,
  type ProposicoesRepository,
} from './proposicoes.repository';
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
    const termo = q?.trim();
    const busca = termo !== undefined && termo.length > 0;

    // A busca textual tem parser de citacao e casamento por token, que seguem
    // em JS; por isso ela precisa do conjunto inteiro antes de paginar.
    const page = await this.repository.loadProposicoesComputaveis({
      ordenacao,
      tema,
      pagination: busca ? undefined : { limit, offset },
    });

    if (!busca) {
      return {
        items: page.items.map(toProposicaoCard),
        total: page.total,
        limit,
        offset,
      };
    }

    const filtered = filterProposicoesByQuery(page.items, termo);
    return {
      items: filtered.slice(offset, offset + limit).map(toProposicaoCard),
      total: filtered.length,
      limit,
      offset,
    };
  }

  async temasDisponiveis(): Promise<TemasDisponiveisResponse> {
    const [computableIds, temaRows] = await Promise.all([
      this.repository.loadComputableExternalIds(),
      this.repository.loadProposicaoTemas(),
    ]);
    return {
      items: [...toTemasDisponiveis(temaRows, new Set(computableIds))],
    };
  }

  async detalhe(externalIdProposicao: number): Promise<ProposicaoDetalhe> {
    const result =
      await this.repository.loadProposicaoDetalhe(externalIdProposicao);
    if (result === null) {
      throw new NotFoundException('proposicao nao encontrada');
    }

    if (result.proposicao.votacaoReferenciaId === null) {
      throw new NotFoundException('proposicao nao computavel pelo matcher');
    }

    return toProposicaoDetalhe(result);
  }
}
