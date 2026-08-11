import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toDeputadoCard } from './mappers/deputado-card.mapper';
import { toDeputadoPerfil } from './mappers/deputado-perfil.mapper';
import { deriveDeputadoOrgaos } from './rules/deputado-orgaos';
import { deriveDeputadoPerfilYear } from './rules/deputado-perfil-year';
import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from './deputados.repository';
import {
  CAMARA_PAGINATED_CLIENT,
  type CamaraPaginatedClient,
} from '../shared/camara/camara-paginated-client';

const CAMARA_API_BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';

@Injectable()
export class DeputadosService {
  private readonly logger = new Logger(DeputadosService.name);

  constructor(
    @Inject(DEPUTADOS_REPOSITORY)
    private readonly repository: DeputadosRepository,
    @Inject(CAMARA_PAGINATED_CLIENT)
    private readonly camaraClient: CamaraPaginatedClient,
  ) {}

  async feed(
    limit: number,
    offset: number,
    q?: string,
    emAtividade?: boolean,
    uf?: string,
    partido?: string,
  ): Promise<DeputadosFeedResponse> {
    const page = await this.repository.loadDeputadosFeed(
      { q, emAtividade, uf, partido },
      { limit, offset },
    );

    return {
      items: page.items.map(toDeputadoCard),
      total: page.total,
      limit,
      offset,
    };
  }

  async ufsDisponiveis(): Promise<UfsDisponiveisResponse> {
    const siglas = new Set(await this.repository.loadUfsDisponiveis());
    return {
      items: [...siglas].sort().map((siglaUf) => ({ siglaUf })),
    };
  }

  async partidosDisponiveis(): Promise<PartidosDisponiveisResponse> {
    const siglas = new Set(await this.repository.loadPartidosDisponiveis());
    return {
      items: [...siglas].sort().map((siglaPartido) => ({ siglaPartido })),
    };
  }

  async perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }
    const resumoPresenca = await this.repository.loadResumoPresenca(source.id);
    return toDeputadoPerfil(source, resumoPresenca);
  }

  async orgaos(
    externalIdDeputado: number,
    year: number,
  ): Promise<DeputadoOrgaosResponse> {
    const startedAt = Date.now();
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      this.logOrgaos({
        externalIdDeputado,
        year,
        startedAt,
        validationError: 'deputado_not_found',
      });
      throw new NotFoundException('deputado nao encontrado');
    }

    const yearRule = deriveDeputadoPerfilYear(source, new Date().getFullYear());
    if (!yearRule.isValidYear(year)) {
      this.logOrgaos({
        externalIdDeputado,
        year,
        startedAt,
        validationError: 'year_out_of_range',
      });
      throw new BadRequestException('year fora da faixa do deputado');
    }

    const params = new URLSearchParams({
      dataInicio: `${year}-01-01`,
      dataFim: `${year}-12-31`,
      itens: '100',
      ordem: 'ASC',
      ordenarPor: 'dataInicio',
    });
    const result = await this.camaraClient.fetchAll(
      `${CAMARA_API_BASE_URL}/deputados/${externalIdDeputado}/orgaos?${params}`,
    );
    if (!result.ok) {
      this.logOrgaos({
        externalIdDeputado,
        year,
        startedAt,
        pages: result.pages,
        receivedItems: result.receivedItems,
        timeout: result.kind === 'timeout',
        error: result.kind,
      });
      throw new ServiceUnavailableException('orgaos da Câmara indisponíveis');
    }

    const transformed = deriveDeputadoOrgaos(result.items);
    if (!transformed.ok) {
      this.logOrgaos({
        externalIdDeputado,
        year,
        startedAt,
        pages: result.pages,
        receivedItems: result.items.length,
        transformedItems: 0,
        validationError: 'invalid_camara_item',
      });
      throw new BadGatewayException('resposta inválida da Câmara');
    }

    this.logOrgaos({
      externalIdDeputado,
      year,
      startedAt,
      pages: result.pages,
      receivedItems: result.items.length,
      transformedItems: transformed.items.length,
      timeout: false,
    });

    return {
      year,
      items: [...transformed.items],
      total: transformed.items.length,
    };
  }

  private logOrgaos(event: {
    externalIdDeputado: number;
    year: number;
    startedAt: number;
    pages?: number;
    receivedItems?: number;
    transformedItems?: number;
    timeout?: boolean;
    error?: string;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'deputado_orgaos_query',
      externalIdDeputado: event.externalIdDeputado,
      year: event.year,
      pages: event.pages ?? 0,
      receivedItems: event.receivedItems ?? 0,
      transformedItems: event.transformedItems ?? 0,
      durationMs: Date.now() - event.startedAt,
      timeout: event.timeout ?? false,
      error: event.error,
      validationError: event.validationError,
    });
  }
}
