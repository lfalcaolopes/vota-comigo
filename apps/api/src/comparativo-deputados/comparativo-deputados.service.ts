import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  DeputadoPerfil,
} from '@vota-comigo/shared-types';

import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from '@/deputados/deputados.repository';
import { toDeputadoPerfil } from '@/deputados/mappers/deputado-perfil.mapper';
import type {
  DeputadoPerfilSource,
  LegislaturaSource,
} from '@/deputados/types/deputados.types';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { toComparativoCota } from './mappers/comparativo-cota.mapper';
import { toComparativoDeputado } from './mappers/comparativo-deputado.mapper';
import { toComparativoOrgaos } from './mappers/comparativo-orgaos.mapper';
import { toComparativoProposicoesAssinadas } from './mappers/comparativo-proposicoes-assinadas.mapper';
import {
  deriveJanelaComparativo,
  type LegislaturaPeriodo,
} from './rules/janela-comparativo';

type ComparativoDeputadoLoaded = {
  source: DeputadoPerfilSource;
  perfil: DeputadoPerfil;
  intervalosExercicio: readonly IntervaloExercicio[];
};

function toLegislaturasJanela(
  legislaturas: readonly LegislaturaSource[],
): readonly LegislaturaPeriodo[] {
  return legislaturas.map((legislatura) => ({
    legislatura: legislatura.externalIdLegislatura,
    dataInicio: legislatura.dataInicio,
    dataFim: legislatura.dataFim,
  }));
}

function getYear(date: string): number {
  return Number(date.slice(0, 4));
}

@Injectable()
export class ComparativoDeputadosService {
  private readonly logger = new Logger(ComparativoDeputadosService.name);

  constructor(
    @Inject(DEPUTADOS_REPOSITORY)
    private readonly repository: DeputadosRepository,
  ) {}

  async comparativo(
    externalIdsDeputado: readonly number[],
  ): Promise<ComparativoDeputadosResponse> {
    const startedAt = Date.now();
    const referencia = new Date();

    const [loaded, legislaturasSource] = await Promise.all([
      Promise.all(
        externalIdsDeputado.map((externalIdDeputado) =>
          this.loadDeputado(externalIdDeputado),
        ),
      ),
      this.repository.loadLegislaturas(),
    ]);
    const legislaturas = toLegislaturasJanela(legislaturasSource);

    const items = await Promise.all(
      loaded.map((deputado) => this.toItem(deputado, legislaturas, referencia)),
    );

    const legislaturasDisponiveis = new Set(
      items
        .map((item) => item.janela)
        .filter((janela) => janela.status === 'disponivel')
        .map((janela) => janela.legislatura),
    );
    const janelasCoincidem = legislaturasDisponiveis.size <= 1;

    this.logComparativo({
      externalIdsDeputado,
      startedAt,
      janelasCoincidem,
    });

    return { janelasCoincidem, items };
  }

  private async loadDeputado(
    externalIdDeputado: number,
  ): Promise<ComparativoDeputadoLoaded> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }

    const [resumoPresenca, intervalosExercicio] = await Promise.all([
      this.repository.loadResumoPresenca(source.id),
      this.repository.loadIntervalosExercicio(source.id),
    ]);

    return {
      source,
      perfil: toDeputadoPerfil(source, resumoPresenca),
      intervalosExercicio,
    };
  }

  private async toItem(
    { source, perfil, intervalosExercicio }: ComparativoDeputadoLoaded,
    legislaturas: readonly LegislaturaPeriodo[],
    referencia: Date,
  ): Promise<ComparativoDeputado> {
    const janela = deriveJanelaComparativo({
      intervalosExercicio,
      legislaturas,
      legislaturaFinal: {
        legislatura: source.externalIdLegislaturaFinal,
        periodo: source.legislaturaFinalPeriodo,
      },
      referencia: referencia.toISOString(),
    });

    if (janela.status !== 'disponivel') {
      return toComparativoDeputado({
        perfil,
        janela,
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      });
    }

    const year = Math.min(getYear(janela.dataFim), referencia.getUTCFullYear());

    const [proposicoesSource, orgaosSource, ceapSource] = await Promise.all([
      this.repository.loadDeputadoProposicoesAssinadasSource(source.id, year),
      this.repository.loadDeputadoOrgaos(source.id, year),
      this.repository.loadDeputadoCeapSource(source.id, year),
    ]);

    return toComparativoDeputado({
      perfil,
      janela,
      proposicoesAssinadas:
        toComparativoProposicoesAssinadas(proposicoesSource),
      orgaos: toComparativoOrgaos(orgaosSource),
      cota:
        perfil.validYearRange === null
          ? { status: 'ano-nao-carregado' }
          : toComparativoCota({
              year,
              validYearRange: perfil.validYearRange,
              source: ceapSource,
            }),
    });
  }

  private logComparativo(event: {
    externalIdsDeputado: readonly number[];
    startedAt: number;
    janelasCoincidem: boolean;
  }): void {
    this.logger.log({
      event: 'comparativo_deputados_query',
      externalIdsDeputado: [...event.externalIdsDeputado],
      janelasCoincidem: event.janelasCoincidem,
      durationMs: Date.now() - event.startedAt,
    });
  }
}
