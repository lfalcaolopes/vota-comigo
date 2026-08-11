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
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toDeputadoCard } from './mappers/deputado-card.mapper';
import { toDeputadoPerfil } from './mappers/deputado-perfil.mapper';
import { deriveDeputadoDiscursos } from './rules/deputado-discursos';
import {
  buildProposicoesAssinadasQuarters,
  deriveDeputadoProposicoesAssinadas,
} from './rules/deputado-proposicoes-assinadas';
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
const PROPOSICOES_ASSINADAS_CONCURRENCY = 2;

async function mapWithConcurrency<TInput, TOutput>(
  inputs: readonly TInput[],
  concurrency: number,
  run: (input: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const outputs: TOutput[] = new Array<TOutput>(inputs.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, inputs.length) },
    async () => {
      while (next < inputs.length) {
        const index = next;
        next += 1;
        outputs[index] = await run(inputs[index]);
      }
    },
  );

  await Promise.all(workers);
  return outputs;
}

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

    const results = await mapWithConcurrency(
      buildProposicoesAssinadasQuarters(year),
      PROPOSICOES_ASSINADAS_CONCURRENCY,
      (quarter) => {
        const params = new URLSearchParams({
          idDeputadoAutor: String(externalIdDeputado),
          dataApresentacaoInicio: quarter.start,
          dataApresentacaoFim: quarter.end,
          itens: '100',
          ordem: 'ASC',
          ordenarPor: 'id',
        });
        return this.camaraClient.fetchAll(
          `${CAMARA_API_BASE_URL}/proposicoes?${params}`,
        );
      },
    );

    const pages = results.reduce((total, result) => total + result.pages, 0);
    const failure = results.find((result) => !result.ok);
    if (failure !== undefined && !failure.ok) {
      this.logProposicoesAssinadas({
        externalIdDeputado,
        year,
        startedAt,
        pages,
        receivedItems: results.reduce(
          (total, result) =>
            total + (result.ok ? result.items.length : result.receivedItems),
          0,
        ),
        timeout: failure.kind === 'timeout',
        error: failure.kind,
      });
      throw new ServiceUnavailableException(
        'proposições assinadas da Câmara indisponíveis',
      );
    }

    const received = results.flatMap((result) =>
      result.ok ? [...result.items] : [],
    );
    const transformed = deriveDeputadoProposicoesAssinadas(received, year);
    if (!transformed.ok) {
      this.logProposicoesAssinadas({
        externalIdDeputado,
        year,
        startedAt,
        pages,
        receivedItems: received.length,
        transformedItems: 0,
        validationError: 'invalid_camara_item',
      });
      throw new BadGatewayException('resposta inválida da Câmara');
    }

    this.logProposicoesAssinadas({
      externalIdDeputado,
      year,
      startedAt,
      pages,
      receivedItems: received.length,
      transformedItems: transformed.items.length,
      timeout: false,
    });

    return {
      year,
      items: [...transformed.items],
      total: transformed.items.length,
    };
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
    pages?: number;
    receivedItems?: number;
    transformedItems?: number;
    timeout?: boolean;
    error?: string;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'deputado_proposicoes_assinadas_query',
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

function approximateBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
