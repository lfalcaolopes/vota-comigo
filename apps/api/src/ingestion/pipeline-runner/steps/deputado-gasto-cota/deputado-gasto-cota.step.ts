import { StrictModeError } from '../../errors/strict-mode-error';
import { createProgressLogger, stepLabel } from '../../reporting/step-logging';
import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

import { aggregateDeputadoGastoCota } from './deputado-gasto-cota.transformer';
import { checkGastoCotaInvariantes } from './gasto-cota-invariantes';
import { toDeputadoGastoCotaAnoRows } from './gasto-cota-ano';
import type { DeputadoGastoCotaRepository } from './deputado-gasto-cota.repository.types';

export function createDeputadoGastoCotaStep(
  repository: DeputadoGastoCotaRepository,
): IngestionStep {
  return {
    name: 'deputado_gasto_cota',
    scope: 'annual',
    dataset: 'ceap',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const year = context.year!;
      const deputadoIds = await repository.loadDeputadoIdByExternalId();
      const progress = createProgressLogger(
        context.reporter,
        stepLabel('deputado_gasto_cota', year),
      );
      let recordsRead = 0;

      const aggregated = await aggregateDeputadoGastoCota({
        rows: countedRows(context, () => {
          recordsRead += 1;
          progress.tick(recordsRead);
        }),
        sourceFile: context.sourceFile,
        year,
        deputadoIds,
      });

      progress.done(recordsRead);

      if (aggregated.fatal !== null) {
        throw new StrictModeError(aggregated.fatal);
      }

      const invariantes = checkGastoCotaInvariantes({
        rows: aggregated.rows,
        totalValorUtilizadoCentavos: aggregated.totalValorUtilizadoCentavos,
      });

      if (!invariantes.ok) {
        throw new StrictModeError({
          file: context.sourceFile,
          line: 0,
          type: 'invariante_de_soma',
          fields: {},
          message: invariantes.message,
        });
      }

      if (context.strict && aggregated.externalGaps.length > 0) {
        throw StrictModeError.fromGap(aggregated.externalGaps[0]);
      }

      // Arquivo sem nenhum registro utilizável não substitui o ano: apagaria
      // uma carga boa por conta de um download vazio ou truncado.
      if (aggregated.coveredThroughMonth === null) {
        return {
          read: aggregated.read,
          inserted: 0,
          updated: 0,
          ignored: aggregated.ignored,
          rejected: aggregated.rejected,
          externalGaps: [
            ...aggregated.externalGaps,
            {
              file: context.sourceFile,
              type: 'fonte_vazia',
              reference: String(year),
              message:
                `Nenhum gasto da cota utilizável em ${context.sourceFile}; ` +
                `os agregados de ${year} foram preservados.`,
            },
          ],
        };
      }

      const { inserted } = context.dryRun
        ? { inserted: 0 }
        : await repository.replaceAno({
            year,
            coveredThroughMonth: aggregated.coveredThroughMonth,
            rows: toDeputadoGastoCotaAnoRows(aggregated.rows),
            categorias: aggregated.categorias,
          });

      return {
        read: aggregated.read,
        inserted,
        updated: 0,
        ignored: aggregated.ignored,
        rejected: aggregated.rejected,
        externalGaps: aggregated.externalGaps,
      };
    },
  };
}

async function* countedRows(
  context: IngestionStepContext,
  onRecord: () => void,
) {
  for await (const row of context.readRecords()) {
    onRecord();
    yield row;
  }
}
