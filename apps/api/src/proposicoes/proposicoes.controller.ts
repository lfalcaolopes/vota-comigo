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
  type TemasDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { ProposicoesService } from './proposicoes.service';
import { normalizePagination } from './rules/pagination';
import { CACHE_LISTING, CACHE_REFERENCE } from '../shared/http/cache-control';
import { CacheControl } from '../shared/http/cache-control.decorator';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';

function parseTema(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestException('tema must be a positive integer');
  }
  return n;
}

@Controller('proposicoes')
export class ProposicoesController {
  constructor(private readonly service: ProposicoesService) {}

  @Get('feed/temas')
  @CacheControl(CACHE_REFERENCE)
  async feedTemas(): Promise<TemasDisponiveisResponse> {
    return this.service.temasDisponiveis();
  }

  @Get('feed')
  @CacheControl(CACHE_LISTING)
  async feed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query(
      'ordenacao',
      new ZodValidationPipe(feedOrdenacao.default('mais-votadas')),
    )
    ordenacao: FeedOrdenacao = 'mais-votadas',
    @Query('tema') temaParam?: string,
    @Query('q') qParam?: string,
  ): Promise<ProposicoesFeedResponse> {
    const pagination = normalizePagination(limit, offset);
    const tema = parseTema(temaParam);
    const q = (qParam ?? '').trim() || undefined;
    return this.service.feed(
      pagination.limit,
      pagination.offset,
      ordenacao,
      tema,
      q,
    );
  }

  @Get(':externalIdProposicao')
  @CacheControl(CACHE_LISTING)
  async detalhe(
    @Param('externalIdProposicao', ParseIntPipe) externalIdProposicao: number,
  ): Promise<ProposicaoDetalhe> {
    return this.service.detalhe(externalIdProposicao);
  }
}
