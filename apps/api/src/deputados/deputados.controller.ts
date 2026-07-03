import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import type {
  DeputadoPerfil,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { DeputadosService } from './deputados.service';
import { CACHE_LISTING, CACHE_REFERENCE } from '../shared/http/cache-control';
import { CacheControl } from '../shared/http/cache-control.decorator';

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;
const OFFSET_DEFAULT = 0;

type DeputadosFeedPagination = {
  limit: number;
  offset: number;
};

function parsePagination(
  limit: number | undefined,
  offset: number | undefined,
): DeputadosFeedPagination {
  const normalizedLimit = limit ?? LIMIT_DEFAULT;
  const normalizedOffset = offset ?? OFFSET_DEFAULT;

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > LIMIT_MAX
  ) {
    throw new BadRequestException('limit must be between 1 and 100');
  }

  if (!Number.isInteger(normalizedOffset) || normalizedOffset < 0) {
    throw new BadRequestException('offset must be zero or positive');
  }

  return { limit: normalizedLimit, offset: normalizedOffset };
}

function parseEmAtividade(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new BadRequestException('emAtividade must be true or false');
}

function parseUf(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const uf = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new BadRequestException('uf must have two letters');
  }
  return uf;
}

function parsePartido(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const partido = raw.trim();
  if (!/^[\p{L}\p{N}.*]{1,24}$/u.test(partido)) {
    throw new BadRequestException('partido must have a valid sigla');
  }
  return partido;
}

@Controller('deputados')
export class DeputadosController {
  constructor(private readonly service: DeputadosService) {}

  @Get('feed/ufs')
  @CacheControl(CACHE_REFERENCE)
  async feedUfs(): Promise<UfsDisponiveisResponse> {
    return this.service.ufsDisponiveis();
  }

  @Get('feed/partidos')
  @CacheControl(CACHE_REFERENCE)
  async feedPartidos(): Promise<PartidosDisponiveisResponse> {
    return this.service.partidosDisponiveis();
  }

  @Get('feed')
  @CacheControl(CACHE_LISTING)
  async feed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('q') qParam?: string,
    @Query('emAtividade') emAtividadeParam?: string,
    @Query('uf') ufParam?: string,
    @Query('partido') partidoParam?: string,
  ): Promise<DeputadosFeedResponse> {
    const pagination = parsePagination(limit, offset);
    const q = (qParam ?? '').trim() || undefined;
    const emAtividade = parseEmAtividade(emAtividadeParam);
    const uf = parseUf(ufParam);
    const partido = parsePartido(partidoParam);
    return this.service.feed(
      pagination.limit,
      pagination.offset,
      q,
      emAtividade,
      uf,
      partido,
    );
  }

  @Get(':externalIdDeputado')
  @CacheControl(CACHE_LISTING)
  async perfil(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
  ): Promise<DeputadoPerfil> {
    return this.service.perfil(externalIdDeputado);
  }
}
