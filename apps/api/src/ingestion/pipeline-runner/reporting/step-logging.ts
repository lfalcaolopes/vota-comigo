import type {
  IngestionReporter,
  StepRunResult,
} from '../types/ingestion-pipeline-runner.types';

export const DEFAULT_PROGRESS_INTERVAL = 5000;

export function stepLabel(stepName: string, year?: number): string {
  return year === undefined ? stepName : `${stepName} ${year}`;
}

export function logStepStart(
  reporter: IngestionReporter | undefined,
  label: string,
  sourceDesc?: string,
): void {
  if (reporter === undefined) {
    return;
  }

  const suffix = sourceDesc === undefined ? '' : ` (${sourceDesc})`;
  reporter.log(`[${label}] iniciando${suffix}`);
}

export function logStepResult(
  reporter: IngestionReporter | undefined,
  label: string,
  result: StepRunResult,
  durationMs: number,
): void {
  if (reporter === undefined) {
    return;
  }

  reporter.log(
    `[${label}] lidos ${result.read}, inseridos ${result.inserted}, atualizados ${result.updated}, ignorados ${result.ignored}, rejeitados ${result.rejected.length} (${Math.round(durationMs)}ms)`,
  );
}

export function logStepGap(
  reporter: IngestionReporter | undefined,
  label: string,
  references: readonly string[],
): void {
  if (reporter === undefined) {
    return;
  }

  reporter.log(
    `[${label}] fonte ausente: ${references.join(', ')} (passo ignorado)`,
  );
}

export type ProgressLogger = {
  tick(processed: number): void;
  done(total: number): void;
};

export function createProgressLogger(
  reporter: IngestionReporter | undefined,
  label: string,
  options: { interval?: number } = {},
): ProgressLogger {
  const interval = options.interval ?? DEFAULT_PROGRESS_INTERVAL;
  let lastReported = 0;

  return {
    tick(processed: number): void {
      if (reporter === undefined || processed - lastReported < interval) {
        return;
      }

      lastReported = processed;
      reporter.log(`[${label}] ${processed} registros processados…`);
    },
    done(total: number): void {
      // Só fecha com linha final quando houve progresso parcial, para não
      // duplicar o resultado do passo em volumes pequenos.
      if (reporter === undefined || lastReported === 0) {
        return;
      }

      reporter.log(`[${label}] leitura concluída: ${total} registros`);
    },
  };
}
