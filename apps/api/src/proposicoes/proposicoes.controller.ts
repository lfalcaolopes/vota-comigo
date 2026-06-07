import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';

import type { MaisVotadasResponse } from '@vota-comigo/shared-types';

import { normalizePagination } from './dto/mais-votadas-query.dto';
import { ProposicoesService } from './proposicoes.service';

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
}
