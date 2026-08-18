import type { VotoCategoria } from '@vota-comigo/shared-types';

import { deriveResumoPresencaPorLegislatura } from '@/deputados/rules/resumo-presenca-por-legislatura';

import { createProgressLogger } from '../../reporting/step-logging';
import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  ComputableVotacaoRow,
  DeputadoComHistoricoRow,
  DeputadoPresencaRepository,
  DeputadoPresencaRow,
  LegislaturaPeriodoRow,
} from './deputado-presenca.repository.types';

export const DEPUTADO_PRESENCA_RULE_VERSION = 1;

export const DEPUTADO_PRESENCA_PROGRESS_INTERVAL = 250;

export function createDeputadoPresencaStep(
  repository: DeputadoPresencaRepository,
): IngestionStep {
  return {
    name: 'deputado_presenca',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      context.reporter?.log(
        '[deputado_presenca] carregando histórico parlamentar…',
      );

      const deputados = await repository.loadDeputadosComHistorico();

      // Sem histórico não há como distinguir ausência de fora de exercício;
      // pular em vez de gravar presença inflada (todo voto vira 100%).
      if (deputados.length === 0) {
        context.reporter?.log(
          '[deputado_presenca] histórico ausente, presença não calculada',
        );
        return emptyResult();
      }

      context.reporter?.log(
        `[deputado_presenca] ${deputados.length} deputado(s) com histórico`,
      );
      context.reporter?.log(
        '[deputado_presenca] carregando legislaturas e votações computáveis…',
      );

      const legislaturas = await repository.loadLegislaturas();

      // Sem legislaturas não há como particionar as votações; o fullReplace
      // zeraria a tabela sem ter como recalcular nada.
      if (legislaturas.length === 0) {
        context.reporter?.log(
          '[deputado_presenca] legislaturas ausentes, presença não calculada',
        );
        return emptyResult();
      }

      const votacoes = await repository.loadComputableVotacoes();

      context.reporter?.log(
        `[deputado_presenca] ${votacoes.length} votação(ões) computável(is) em ${legislaturas.length} legislatura(s)`,
      );
      context.reporter?.log(
        `[deputado_presenca] calculando presença de ${deputados.length} deputado(s)…`,
      );

      const progress = createProgressLogger(
        context.reporter,
        'deputado_presenca',
        {
          interval: DEPUTADO_PRESENCA_PROGRESS_INTERVAL,
          unit: 'deputado(s)',
        },
      );
      const rows = toDeputadoPresencaRows(
        deputados,
        votacoes,
        legislaturas,
        (processed) => progress.tick(processed),
      );

      const deputadosComLinha = new Set(rows.map((row) => row.deputadoId));

      context.reporter?.log(
        `[deputado_presenca] ${deputadosComLinha.size} deputado(s) com presença de ${deputados.length} com histórico`,
      );

      if (!context.dryRun) {
        context.reporter?.log(
          `[deputado_presenca] gravando ${rows.length} linha(s)…`,
        );
      }

      const refresh = context.dryRun
        ? { inserted: 0 }
        : await repository.fullReplace(rows);

      return {
        read: deputados.length,
        inserted: refresh.inserted,
        updated: 0,
        ignored: deputados.length - deputadosComLinha.size,
        rejected: [],
        externalGaps: [],
      };
    },
  };
}

export function toDeputadoPresencaRows(
  deputados: readonly DeputadoComHistoricoRow[],
  votacoes: readonly ComputableVotacaoRow[],
  legislaturas: readonly LegislaturaPeriodoRow[],
  onDeputadoProcessed?: (processed: number) => void,
): readonly DeputadoPresencaRow[] {
  const votacoesComVoto = votacoes.map((votacao) => ({
    votacao: {
      dataHoraRegistro: votacao.dataHoraRegistro,
      data: votacao.data,
    },
    votoByDeputado: invertVotosJson(votacao.votosJson),
  }));

  return deputados.flatMap(({ deputadoId, eventos }, index) => {
    const resultados = deriveResumoPresencaPorLegislatura({
      eventos,
      votacoes: votacoesComVoto.map((votacao) => ({
        votacao: votacao.votacao,
        voto: votacao.votoByDeputado.get(deputadoId) ?? null,
      })),
      legislaturas,
    });

    onDeputadoProcessed?.(index + 1);

    return resultados.flatMap((resultado) => {
      if (resultado.resumoPresenca === null) {
        return [];
      }

      return [
        {
          deputadoId,
          legislaturaId: resultado.legislaturaId,
          presencas: resultado.resumoPresenca.presencas,
          ausenciasSemMotivoConhecido:
            resultado.resumoPresenca.ausenciasSemMotivoConhecido,
          foraDeExercicio: resultado.foraDeExercicio,
          lacunaDeDados: resultado.lacunaDeDados,
          ruleVersion: DEPUTADO_PRESENCA_RULE_VERSION,
        },
      ];
    });
  });
}

function invertVotosJson(
  votosJson: Readonly<Record<VotoCategoria, readonly string[]>>,
): ReadonlyMap<string, VotoCategoria> {
  const votoByDeputado = new Map<string, VotoCategoria>();

  for (const [categoria, deputadoIds] of Object.entries(votosJson)) {
    for (const deputadoId of deputadoIds) {
      votoByDeputado.set(deputadoId, categoria as VotoCategoria);
    }
  }

  return votoByDeputado;
}

function emptyResult(): StepRunResult {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
  };
}
