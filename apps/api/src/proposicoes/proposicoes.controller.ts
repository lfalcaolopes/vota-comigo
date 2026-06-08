import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import type {
  MaisVotadasResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
} from '@vota-comigo/shared-types';

import { ProposicoesService } from './proposicoes.service';
import { normalizePagination } from './rules/pagination';
import { tokenizeQuery } from './rules/proposicoes-search';

@Controller('proposicoes')
export class ProposicoesController {
  constructor(private readonly service: ProposicoesService) {}

  @Get('mais-votadas')
  async maisVotadas(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<MaisVotadasResponse> {
    const pagination = normalizePagination(limit, offset);
    return this.service.maisVotadas(pagination.limit, pagination.offset);
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
