import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  DeputadoPerfil,
} from '@vota-comigo/shared-types';

import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from '@/deputados/deputados.repository';
import { toDeputadoOrgaosResponse } from '@/deputados/mappers/deputado-orgaos.mapper';
import { toDeputadoPerfil } from '@/deputados/mappers/deputado-perfil.mapper';
import { toDeputadoProposicoesAssinadasResponse } from '@/deputados/mappers/deputado-proposicoes-assinadas.mapper';
import type { DeputadoPerfilSource } from '@/deputados/types/deputados.types';

import { toComparativoCota } from './mappers/comparativo-cota.mapper';
import { toComparativoDeputado } from './mappers/comparativo-deputado.mapper';
import { deriveComparableYears } from './rules/comparable-years';

type ComparativoDeputadoLoaded = {
  source: DeputadoPerfilSource;
  perfil: DeputadoPerfil;
};

@Injectable()
export class ComparativoDeputadosService {
  private readonly logger = new Logger(ComparativoDeputadosService.name);

  constructor(
    @Inject(DEPUTADOS_REPOSITORY)
    private readonly repository: DeputadosRepository,
  ) {}

  async comparativo(
    externalIdsDeputado: readonly number[],
    year?: number,
  ): Promise<ComparativoDeputadosResponse> {
    const startedAt = Date.now();
    const loaded = await Promise.all(
      externalIdsDeputado.map((externalIdDeputado) =>
        this.loadDeputado(externalIdDeputado),
      ),
    );

    const { comparableYears, defaultYear } = deriveComparableYears(
      loaded.map(({ perfil }) => perfil.validYearRange),
    );
    if (year !== undefined && !comparableYears.includes(year)) {
      this.logComparativo({
        externalIdsDeputado,
        year,
        startedAt,
        validationError: 'year_out_of_range',
      });
      throw new BadRequestException('year fora dos anos comparáveis');
    }
    const selectedYear = year ?? defaultYear;

    const items = await Promise.all(
      loaded.map((deputado) => this.toItem(deputado, selectedYear)),
    );

    this.logComparativo({
      externalIdsDeputado,
      year: selectedYear,
      startedAt,
      comparableYears: comparableYears.length,
    });

    return {
      year: selectedYear,
      comparableYears: [...comparableYears],
      items,
    };
  }

  private async loadDeputado(
    externalIdDeputado: number,
  ): Promise<ComparativoDeputadoLoaded> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }

    const resumoPresenca = await this.repository.loadResumoPresenca(source.id);
    return { source, perfil: toDeputadoPerfil(source, resumoPresenca) };
  }

  private async toItem(
    { source, perfil }: ComparativoDeputadoLoaded,
    year: number | null,
  ): Promise<ComparativoDeputado> {
    if (year === null || perfil.validYearRange === null) {
      return toComparativoDeputado({
        perfil,
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      });
    }

    const [proposicoesSource, orgaosSource, ceapSource] = await Promise.all([
      this.repository.loadDeputadoProposicoesAssinadasSource(source.id, year),
      this.repository.loadDeputadoOrgaos(source.id, year),
      this.repository.loadDeputadoCeapSource(source.id, year),
    ]);

    return toComparativoDeputado({
      perfil,
      proposicoesAssinadas: toDeputadoProposicoesAssinadasResponse(
        year,
        proposicoesSource,
      ),
      orgaos: toDeputadoOrgaosResponse(year, orgaosSource),
      cota: toComparativoCota({
        year,
        validYearRange: perfil.validYearRange,
        source: ceapSource,
      }),
    });
  }

  private logComparativo(event: {
    externalIdsDeputado: readonly number[];
    year: number | null;
    startedAt: number;
    comparableYears?: number;
    validationError?: string;
  }): void {
    this.logger.log({
      event: 'comparativo_deputados_query',
      externalIdsDeputado: [...event.externalIdsDeputado],
      year: event.year,
      comparableYears: event.comparableYears ?? 0,
      durationMs: Date.now() - event.startedAt,
      validationError: event.validationError,
    });
  }
}
