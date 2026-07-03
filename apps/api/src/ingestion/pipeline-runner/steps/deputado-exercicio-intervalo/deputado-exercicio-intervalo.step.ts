import { deriveIntervalosExercicio } from '@/exercicio/rules/intervalos-exercicio';

import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  DeputadoComHistoricoRow,
  DeputadoExercicioIntervaloRepository,
  DeputadoExercicioIntervaloRow,
} from './deputado-exercicio-intervalo.repository.types';

export const DEPUTADO_EXERCICIO_INTERVALO_RULE_VERSION = 1;

export function createDeputadoExercicioIntervaloStep(
  repository: DeputadoExercicioIntervaloRepository,
): IngestionStep {
  return {
    name: 'deputado_exercicio_intervalo',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const deputados = await repository.loadDeputadosComHistorico();

      // Sem histórico não há eventos de entrada/saída; pular em vez de
      // apagar intervalos já materializados (histórico é carregado à parte).
      if (deputados.length === 0) {
        context.reporter?.log(
          '[deputado_exercicio_intervalo] histórico ausente, intervalos não calculados',
        );
        return emptyResult();
      }

      const rows = toDeputadoExercicioIntervaloRows(deputados);
      const deputadosComIntervalo = new Set(rows.map((row) => row.deputadoId));

      context.reporter?.log(
        `[deputado_exercicio_intervalo] ${rows.length} intervalo(s) de ${deputadosComIntervalo.size} deputado(s) de ${deputados.length} com histórico`,
      );

      const refresh = context.dryRun
        ? { inserted: 0 }
        : await repository.fullReplace(rows);

      return {
        read: deputados.length,
        inserted: refresh.inserted,
        updated: 0,
        ignored: deputados.length - deputadosComIntervalo.size,
        rejected: [],
        externalGaps: [],
      };
    },
  };
}

export function toDeputadoExercicioIntervaloRows(
  deputados: readonly DeputadoComHistoricoRow[],
): readonly DeputadoExercicioIntervaloRow[] {
  return deputados.flatMap(({ deputadoId, eventos }) =>
    deriveIntervalosExercicio(eventos).map(
      (intervalo): DeputadoExercicioIntervaloRow => ({
        deputadoId,
        openedAt: intervalo.openedAt,
        closedAt: intervalo.closedAt,
        ruleVersion: DEPUTADO_EXERCICIO_INTERVALO_RULE_VERSION,
      }),
    ),
  );
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
