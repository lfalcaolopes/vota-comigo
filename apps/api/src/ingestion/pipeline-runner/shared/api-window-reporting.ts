import type { IngestionStepContext } from '../types/ingestion-pipeline-runner.types';

const PROGRESS_INTERVAL = 50;

// Passos de API rodam em janelas conduzidas à mão, então relatam de deputado
// em deputado e fecham dizendo quanto sobrou para a próxima execução.
export type ApiWindowReporting = {
  progress(processed: number, total: number): void;
  status(processed: number, total: number, failures: number): void;
  pendingSummary(totalPending: number, processed: number): void;
};

export function createApiWindowReporting(
  context: IngestionStepContext,
  label: string,
): ApiWindowReporting {
  const reporter = context.reporter;

  return {
    progress(processed: number, total: number): void {
      if (reporter === undefined) {
        return;
      }

      if (processed !== total && processed % PROGRESS_INTERVAL !== 0) {
        return;
      }

      reporter.log(
        `[${label}] ${processed}/${total} deputados (${percent(processed, total)}%)`,
      );
    },

    status(processed: number, total: number, failures: number): void {
      if (!context.debug || reporter?.status === undefined) {
        return;
      }

      reporter.status(
        `${label} ${processed}/${total} (${percent(processed, total)}%) ok:${processed - failures} falhas:${failures}`,
      );
    },

    pendingSummary(totalPending: number, processed: number): void {
      if (reporter === undefined) {
        return;
      }

      const remaining = Math.max(totalPending - processed, 0);
      const tail =
        remaining > 0 ? ' — rode de novo para continuar' : ' — nada pendente';

      reporter.log(
        `[${label}] ${processed} processados nesta janela, ${remaining} ainda pendentes${tail}`,
      );
    },
  };
}

function percent(processed: number, total: number): number {
  return total === 0 ? 100 : Math.round((processed / total) * 100);
}
