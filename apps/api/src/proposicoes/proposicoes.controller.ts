import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import {
  feedOrdenacao,
  type FeedOrdenacao,
  type ProposicoesFeedResponse,
  type ProposicaoDetalhe,
  type ProposicoesSearchResponse,
} from '@vota-comigo/shared-types';

import { ProposicoesService } from './proposicoes.service';
import { normalizePagination } from './rules/pagination';
import { tokenizeQuery } from './rules/proposicoes-search';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';

@Controller('proposicoes')
export class ProposicoesController {
  constructor(private readonly service: ProposicoesService) {}

  @Get('feed')
  async feed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('ordenacao', new ZodValidationPipe(feedOrdenacao.default('mais-votadas')))
    ordenacao: FeedOrdenacao = 'mais-votadas',
  ): Promise<ProposicoesFeedResponse> {
    const pagination = normalizePagination(limit, offset);
    return this.service.feed(pagination.limit, pagination.offset, ordenacao);
  }

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ProposicoesSearchResponse> {
    const query = (q ?? '').trim();
    if (tokenizeQuery(query).length === 0) {
      throw new BadRequestException('q must be a useful search query');
    }
    const pagination = normalizePagination(limit, offset);
    return this.service.search(query, pagination.limit, pagination.offset);
  }

  @Get(':externalIdProposicao')
  async detalhe(
    @Param('externalIdProposicao', ParseIntPipe) externalIdProposicao: number,
  ): Promise<ProposicaoDetalhe> {
    return this.service.detalhe(externalIdProposicao);
  }
}
