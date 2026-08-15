import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  ComparativoJanela,
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
import { deriveCoberturaJanela } from './rules/cobertura-janela';
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

function toAnosDaJanela(
  dataInicio: string,
  dataFim: string,
): readonly number[] {
  const anoInicio = getYear(dataInicio);
  const anoFim = getYear(dataFim);

  return Array.from(
    { length: Math.max(0, anoFim - anoInicio + 1) },
    (_, index) => anoInicio + index,
  );
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

    const years = toAnosDaJanela(janela.dataInicio, janela.dataFim);

    const [proposicoesSource, orgaosSource, cotaSource] = await Promise.all([
      this.repository.loadDeputadoProposicoesAssinadasJanela(source.id, years),
      this.repository.loadDeputadoOrgaosNaJanela(
        source.id,
        janela.dataInicio.slice(0, 10),
        janela.dataFim.slice(0, 10),
      ),
      this.repository.loadDeputadoCotaJanelaSource(source.id, years),
    ]);

    // A cobertura vem antes da cota: os dias de cada ano param onde a fonte
    // para, e é a cobertura que sabe onde isso é.
    const cobertura = deriveCoberturaJanela({
      dataInicioJanela: janela.dataInicio,
      dataFimJanela: janela.dataFim,
      coberturaCotaMensal: cotaSource.anos.flatMap((ano) =>
        ano.coveredThroughMonth === null
          ? []
          : [{ year: ano.year, coveredThroughMonth: ano.coveredThroughMonth }],
      ),
      coveredThroughDateAssinaturas: proposicoesSource.coveredThroughDate,
    });
    const janelaComCobertura: ComparativoJanela = { ...janela, ...cobertura };

    return toComparativoDeputado({
      perfil,
      janela: janelaComCobertura,
      proposicoesAssinadas:
        toComparativoProposicoesAssinadas(proposicoesSource),
      orgaos: toComparativoOrgaos(orgaosSource),
      cota: toComparativoCota({
        dataInicioJanela: janela.dataInicio,
        dataFimJanela: janela.dataFim,
        coberturaAte: cobertura.coberturaAte,
        source: cotaSource,
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
