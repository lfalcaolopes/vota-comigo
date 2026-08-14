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
  DeputadoDiscursosResponse,
  DeputadoCeapResponse,
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toDeputadoCard } from './mappers/deputado-card.mapper';
import { toDeputadoCeapLoadedResponse } from './mappers/deputado-ceap.mapper';
import { toDeputadoOrgaosResponse } from './mappers/deputado-orgaos.mapper';
import { toDeputadoPerfil } from './mappers/deputado-perfil.mapper';
import { toDeputadoProposicoesAssinadasResponse } from './mappers/deputado-proposicoes-assinadas.mapper';
import { deriveDeputadoDiscursos } from './rules/deputado-discursos';
import { deriveDeputadoCeapState } from './rules/deputado-ceap-state';
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

  async ceap(
    externalIdDeputado: number,
    year?: number,
  ): Promise<DeputadoCeapResponse> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }

    const yearRule = deriveDeputadoPerfilYear(source, new Date().getFullYear());
    const selectedYear = year ?? yearRule.defaultYear;
    if (
      selectedYear === null ||
      yearRule.validYearRange === null ||
      !yearRule.isValidYear(selectedYear)
    ) {
      throw new BadRequestException('year fora da faixa do deputado');
    }

    const ceapSource = await this.repository.loadDeputadoCeapSource(
      source.id,
      selectedYear,
    );
    const state = deriveDeputadoCeapState({
      year: selectedYear,
      validYearRange: yearRule.validYearRange,
      ingestedYears: ceapSource.coberturas.map((item) => item.year),
      hasGastos: ceapSource.gasto !== null,
    });

    if (state.status === 'ano-nao-carregado') {
      return {
        year: selectedYear,
        availableYears: [...state.availableYears],
        status: state.status,
      };
    }

    const cobertura = ceapSource.coberturas.find(
      (item) => item.year === selectedYear,
    );
    if (state.status === null || cobertura === undefined) {
      throw new BadRequestException('year fora da faixa do deputado');
    }

    return toDeputadoCeapLoadedResponse({
      year: selectedYear,
      availableYears: state.availableYears,
      status: state.status,
      coveredThroughMonth: cobertura.coveredThroughMonth,
      source: ceapSource,
    });
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

    const orgaosSource = await this.repository.loadDeputadoOrgaos(
      source.id,
      year,
    );
    const response = toDeputadoOrgaosResponse(year, orgaosSource);

    this.logOrgaos({
      externalIdDeputado,
      year,
      startedAt,
      items: response.total,
    });

    return response;
  }

  async proposicoesAssinadas(
    externalIdDeputado: number,
    year: number,
  ): Promise<DeputadoProposicoesAssinadasResponse> {
    const startedAt = Date.now();
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      this.logProposicoesAssinadas({
        externalIdDeputado,
        year,
        startedAt,
        validationError: 'deputado_not_found',
      });
      throw new NotFoundException('deputado nao encontrado');
    }

    const yearRule = deriveDeputadoPerfilYear(source, new Date().getFullYear());
    if (!yearRule.isValidYear(year)) {
      this.logProposicoesAssinadas({
        externalIdDeputado,
        year,
        startedAt,
        validationError: 'year_out_of_range',
      });
      throw new BadRequestException('year fora da faixa do deputado');
    }

    const proposicoesSource =
      await this.repository.loadDeputadoProposicoesAssinadasSource(
        source.id,
        year,
      );

    const response = toDeputadoProposicoesAssinadasResponse(
      year,
      proposicoesSource,
    );

    this.logProposicoesAssinadas({
      externalIdDeputado,
      year,
      startedAt,
      anoCoberto: response.disponivel,
      total: response.disponivel ? response.total : undefined,
      totalPrimeiroSignatario: response.disponivel
        ? response.totalPrimeiroSignatario
        : undefined,
    });

    return response;
  }

  async discursos(
    externalIdDeputado: number,
    year: number,
  ): Promise<DeputadoDiscursosResponse> {
    const startedAt = Date.now();
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      this.logDiscursos({
        externalIdDeputado,
        year,
        startedAt,
        validationError: 'deputado_not_found',
      });
      throw new NotFoundException('deputado nao encontrado');
    }

    const yearRule = deriveDeputadoPerfilYear(source, new Date().getFullYear());
    if (!yearRule.isValidYear(year)) {
      this.logDiscursos({
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
      ordem: 'DESC',
      ordenarPor: 'dataHoraInicio',
    });
    const result = await this.camaraClient.fetchAll(
      `${CAMARA_API_BASE_URL}/deputados/${externalIdDeputado}/discursos?${params}`,
    );
    if (!result.ok) {
      this.logDiscursos({
        externalIdDeputado,
        year,
        startedAt,
        pages: result.pages,
        receivedItems: result.receivedItems,
        timeout: result.kind === 'timeout',
        error: result.kind,
      });
      throw new ServiceUnavailableException(
        'discursos da Câmara indisponíveis',
      );
    }

    const transformed = deriveDeputadoDiscursos(result.items);
    if (!transformed.ok) {
      this.logDiscursos({
        externalIdDeputado,
        year,
        startedAt,
        pages: result.pages,
        receivedItems: result.items.length,
        transformedItems: 0,
        externalResponseBytes: approximateBytes(result.items),
        validationError: 'invalid_camara_item',
      });
      throw new BadGatewayException('resposta inválida da Câmara');
    }

    const missingSummaryItems = transformed.items.filter(
      (item) => item.sumario === null,
    ).length;
    const missingAssuntosItems = transformed.items.filter(
      (item) => item.assuntos.length === 0,
    ).length;
    const missingLinksItems = transformed.items.filter(
      (item) => item.links.length === 0,
    ).length;
    this.logDiscursos({
      externalIdDeputado,
      year,
      startedAt,
      pages: result.pages,
      receivedItems: result.items.length,
      transformedItems: transformed.items.length,
      externalResponseBytes: approximateBytes(result.items),
      missingSummaryItems,
      missingAssuntosItems,
      missingLinksItems,
      timeout: false,
    });

    return {
      year,
      items: [...transformed.items],
      total: transformed.items.length,
    };
  }

  private logProposicoesAssinadas(event: {
    externalIdDeputado: number;
    year: number;
    startedAt: number;
    anoCoberto?: boolean;
    total?: number;
    totalPrimeiroSignatario?: number;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'deputado_proposicoes_assinadas_query',
      externalIdDeputado: event.externalIdDeputado,
      year: event.year,
      anoCoberto: event.anoCoberto ?? false,
      total: event.total ?? 0,
      totalPrimeiroSignatario: event.totalPrimeiroSignatario ?? 0,
      durationMs: Date.now() - event.startedAt,
      validationError: event.validationError,
    });
  }

  private logDiscursos(event: {
    externalIdDeputado: number;
    year: number;
    startedAt: number;
    pages?: number;
    receivedItems?: number;
    transformedItems?: number;
    externalResponseBytes?: number;
    missingSummaryItems?: number;
    missingAssuntosItems?: number;
    missingLinksItems?: number;
    timeout?: boolean;
    error?: string;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'deputado_discursos_query',
      externalIdDeputado: event.externalIdDeputado,
      year: event.year,
      pages: event.pages ?? 0,
      receivedItems: event.receivedItems ?? 0,
      transformedItems: event.transformedItems ?? 0,
      durationMs: Date.now() - event.startedAt,
      externalResponseBytes: event.externalResponseBytes ?? 0,
      missingSummaryItems: event.missingSummaryItems ?? 0,
      missingAssuntosItems: event.missingAssuntosItems ?? 0,
      missingLinksItems: event.missingLinksItems ?? 0,
      timeout: event.timeout ?? false,
      error: event.error,
      validationError: event.validationError,
    });
  }

  private logOrgaos(event: {
    externalIdDeputado: number;
    year: number;
    startedAt: number;
    items?: number;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'deputado_orgaos_query',
      externalIdDeputado: event.externalIdDeputado,
      year: event.year,
      items: event.items ?? 0,
      durationMs: Date.now() - event.startedAt,
      validationError: event.validationError,
    });
  }
}

function approximateBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
