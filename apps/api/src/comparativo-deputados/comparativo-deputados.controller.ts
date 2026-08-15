import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import {
  MAX_COMPARATIVO_DEPUTADOS,
  MIN_COMPARATIVO_DEPUTADOS,
  type ComparativoDeputadosResponse,
} from '@vota-comigo/shared-types';

import { ComparativoDeputadosService } from './comparativo-deputados.service';
import { CACHE_LISTING } from '../shared/http/cache-control';
import { CacheControl } from '../shared/http/cache-control.decorator';

function parseExternalIdsDeputado(raw: string | undefined): number[] {
  const externalIdsDeputado = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map(Number);

  if (
    externalIdsDeputado.length < MIN_COMPARATIVO_DEPUTADOS ||
    externalIdsDeputado.length > MAX_COMPARATIVO_DEPUTADOS ||
    externalIdsDeputado.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(externalIdsDeputado).size !== externalIdsDeputado.length
  ) {
    throw new BadRequestException(
      `ids must have ${MIN_COMPARATIVO_DEPUTADOS} or ${MAX_COMPARATIVO_DEPUTADOS} distinct deputados`,
    );
  }

  return externalIdsDeputado;
}

@Controller('comparativo-deputados')
export class ComparativoDeputadosController {
  constructor(private readonly service: ComparativoDeputadosService) {}

  @Get()
  @CacheControl(CACHE_LISTING)
  async comparativo(
    @Query('ids') idsParam?: string,
  ): Promise<ComparativoDeputadosResponse> {
    return this.service.comparativo(parseExternalIdsDeputado(idsParam));
  }
}
