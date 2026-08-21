import { deriveUsoCota } from '@/shared/cota/uso-cota';

import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  DeputadoCotaUsoRepository,
  DeputadoCotaUsoRow,
} from './deputado-cota-uso.repository.types';

export function createDeputadoCotaUsoStep(
  repository: DeputadoCotaUsoRepository,
  now: () => Date = () => new Date(),
): IngestionStep {
  return {
    name: 'deputado_cota_uso',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const [coberturas, legislaturas, deputados] = await Promise.all([
        repository.loadCoberturas(),
        repository.loadLegislaturas(),
        repository.loadDeputados(),
      ]);
      const referencia = now().toISOString().slice(0, 10);
      const rows: DeputadoCotaUsoRow[] = deputados.map((deputado) => ({
        deputadoId: deputado.deputadoId,
        referencia,
        apuracao: deriveUsoCota({
          externalIdDeputado: deputado.externalIdDeputado,
          intervalosExercicio: deputado.intervalosExercicio,
          legislaturas,
          coberturas,
          gastos: deputado.gastos,
          ufs: deputado.ufs,
          referencia,
        }),
      }));

      context.reporter?.log(
        `[deputado_cota_uso] ${rows.length} uso(s) de cota apurado(s)`,
      );
      if (context.dryRun) {
        return emptyResult(rows.length);
      }
      const { inserted } = await repository.replaceAll(rows);
      return { ...emptyResult(rows.length), inserted };
    },
  };
}

function emptyResult(read: number): StepRunResult {
  return {
    read,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
  };
}
