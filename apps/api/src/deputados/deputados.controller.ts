import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import {
  deputadoFaixaEtariaSchema,
  deputadoSexoSchema,
  type DeputadoDiscursosResponse,
  type DeputadoCeapResponse,
  type DeputadoFaixaEtaria,
  type DeputadoPerfil,
  type DeputadoOrgaosResponse,
  type DeputadoProposicoesAssinadasResponse,
  type DeputadoSexo,
  type DeputadosFeedResponse,
  type PartidosDisponiveisResponse,
  type UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { DeputadosService } from './deputados.service';
import {
  CACHE_EXTERNAL_RUNTIME,
  CACHE_LISTING,
  CACHE_REFERENCE,
} from '../shared/http/cache-control';
import { CacheControl } from '../shared/http/cache-control.decorator';

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;
const OFFSET_DEFAULT = 0;
const MAX_VALORES_POR_FILTRO = 40;

type QueryParam = string | readonly string[] | undefined;

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

// Um valor repetido na query string chega como array; um só, como string. As
// duas formas viram a mesma lista, então ?uf=SP continua valendo.
function toList(raw: QueryParam): readonly string[] | undefined {
  if (raw === undefined) return undefined;
  const values = (Array.isArray(raw) ? raw : [raw]).filter(
    (value) => typeof value === 'string',
  );
  if (values.length > MAX_VALORES_POR_FILTRO) {
    throw new BadRequestException(
      `each filter accepts at most ${MAX_VALORES_POR_FILTRO} values`,
    );
  }
  return values;
}

function parseUf(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const uf = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new BadRequestException('uf must have two letters');
  }
  return uf;
}

function parseUfs(raw: QueryParam): readonly string[] | undefined {
  const values = toList(raw);
  if (values === undefined) return undefined;

  const ufs = values.map((value) => value.trim().toUpperCase());
  if (ufs.some((uf) => !/^[A-Z]{2}$/.test(uf))) {
    throw new BadRequestException('uf must have two letters');
  }
  return [...new Set(ufs)];
}

function parsePartidos(raw: QueryParam): readonly string[] | undefined {
  const values = toList(raw);
  if (values === undefined) return undefined;

  const partidos = values.map((value) => value.trim());
  if (partidos.some((partido) => !/^[\p{L}\p{N}.*]{1,24}$/u.test(partido))) {
    throw new BadRequestException('partido must have a valid sigla');
  }
  return [...new Set(partidos)];
}

function parseSexo(raw: string | undefined): DeputadoSexo | undefined {
  if (raw === undefined) return undefined;

  const parsed = deputadoSexoSchema.safeParse(raw.trim().toUpperCase());
  if (!parsed.success) {
    throw new BadRequestException('sexo must be F or M');
  }
  return parsed.data;
}

function parseFaixasEtarias(
  raw: QueryParam,
): readonly DeputadoFaixaEtaria[] | undefined {
  const values = toList(raw);
  if (values === undefined) return undefined;

  const faixas = values.map((value) => {
    const parsed = deputadoFaixaEtariaSchema.safeParse(value.trim());
    if (!parsed.success) {
      throw new BadRequestException('faixaEtaria must be a known range');
    }
    return parsed.data;
  });
  return [...new Set(faixas)];
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
  async feedPartidos(
    @Query('uf') ufParam?: string,
  ): Promise<PartidosDisponiveisResponse> {
    return this.service.partidosDisponiveis(parseUf(ufParam));
  }

  @Get('feed')
  @CacheControl(CACHE_LISTING)
  async feed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('q') qParam?: string,
    @Query('emAtividade') emAtividadeParam?: string,
    @Query('uf') ufParam?: QueryParam,
    @Query('partido') partidoParam?: QueryParam,
    @Query('sexo') sexoParam?: string,
    @Query('faixaEtaria') faixaEtariaParam?: QueryParam,
  ): Promise<DeputadosFeedResponse> {
    return this.service.feed(
      {
        q: (qParam ?? '').trim() || undefined,
        emAtividade: parseEmAtividade(emAtividadeParam),
        ufs: parseUfs(ufParam),
        partidos: parsePartidos(partidoParam),
        sexo: parseSexo(sexoParam),
        faixasEtarias: parseFaixasEtarias(faixaEtariaParam),
      },
      parsePagination(limit, offset),
    );
  }

  @Get(':externalIdDeputado/orgaos')
  @CacheControl(CACHE_LISTING)
  async orgaos(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
    @Query('year', ParseIntPipe) year: number,
  ): Promise<DeputadoOrgaosResponse> {
    return this.service.orgaos(externalIdDeputado, year);
  }

  @Get(':externalIdDeputado/proposicoes-assinadas')
  @CacheControl(CACHE_LISTING)
  async proposicoesAssinadas(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
    @Query('year', ParseIntPipe) year: number,
  ): Promise<DeputadoProposicoesAssinadasResponse> {
    return this.service.proposicoesAssinadas(externalIdDeputado, year);
  }

  @Get(':externalIdDeputado/discursos')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CacheControl(CACHE_EXTERNAL_RUNTIME)
  async discursos(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
    @Query('year', ParseIntPipe) year: number,
  ): Promise<DeputadoDiscursosResponse> {
    return this.service.discursos(externalIdDeputado, year);
  }

  @Get(':externalIdDeputado/ceap')
  @CacheControl(CACHE_LISTING)
  async ceap(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ): Promise<DeputadoCeapResponse> {
    return this.service.ceap(externalIdDeputado, year);
  }

  @Get(':externalIdDeputado')
  @CacheControl(CACHE_LISTING)
  async perfil(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
  ): Promise<DeputadoPerfil> {
    return this.service.perfil(externalIdDeputado);
  }
}
