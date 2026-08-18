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
import { toResumoPresenca } from '@/deputados/rules/resumo-presenca';
import type {
  DeputadoPerfilSource,
  LegislaturaSource,
} from '@/deputados/types/deputados.types';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { toComparativoDeputado } from './mappers/comparativo-deputado.mapper';
import { toComparativoOrgaos } from './mappers/comparativo-orgaos.mapper';
import { toComparativoProposicoesAssinadas } from './mappers/comparativo-proposicoes-assinadas.mapper';
import { deriveCoberturaJanela } from './rules/cobertura-janela';
import {
  deriveAnosDaJanela,
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

    const intervalosExercicio = await this.repository.loadIntervalosExercicio(
      source.id,
    );

    return {
      source,
      perfil: toDeputadoPerfil(source, null),
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
        resumoPresenca: null,
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      });
    }

    const years = deriveAnosDaJanela(
      janela.dataInicio,
      janela.dataFim,
      referencia.toISOString(),
    );

    const [
      proposicoesSource,
      orgaosSource,
      coberturaCotaMensal,
      cotaComparacao,
      resumoPresencaRow,
    ] = await Promise.all([
      this.repository.loadDeputadoProposicoesAssinadasJanela(source.id, years),
      this.repository.loadDeputadoOrgaosNaJanela(
        source.id,
        janela.dataInicio.slice(0, 10),
        janela.dataFim.slice(0, 10),
      ),
      this.repository.loadCoberturaCotaMensal(years),
      this.repository.loadCotaComparacao(source.id),
      this.repository.loadResumoPresencaDaLegislatura(
        source.id,
        janela.legislatura,
      ),
    ]);

    const cobertura = deriveCoberturaJanela({
      dataInicioJanela: janela.dataInicio,
      dataFimJanela: janela.dataFim,
      coberturaCotaMensal,
      coveredThroughDateAssinaturas: proposicoesSource.coveredThroughDate,
    });
    const janelaComCobertura: ComparativoJanela = { ...janela, ...cobertura };

    return toComparativoDeputado({
      perfil,
      janela: janelaComCobertura,
      resumoPresenca:
        resumoPresencaRow === null ? null : toResumoPresenca(resumoPresencaRow),
      proposicoesAssinadas:
        toComparativoProposicoesAssinadas(proposicoesSource),
      orgaos: toComparativoOrgaos(orgaosSource),
      // A comparação de cota é materializada na ingestão; uma linha de outra
      // legislatura é resto de ingestão anterior e não descreve esta janela.
      cota:
        cotaComparacao !== null &&
        cotaComparacao.legislatura === janela.legislatura
          ? cotaComparacao.cota
          : null,
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
