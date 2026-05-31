import { basename } from 'node:path';
import { createReadStream, existsSync } from 'node:fs';
import type { Readable } from 'node:stream';

import { readCsvRecords } from './csv-reader';
import type { CsvReader } from './csv-reader';
import { buildIngestionPlan } from './ingestion-plan';
import { resolveIngestionRunnerConfig } from './ingestion-runner.config';
import { writeErrorLog } from './error-log';
import { createIngestionSteps } from './ingestion-steps';
import { nodeErrorLogFileSystem } from './node-error-log-file-system';
import type { ErrorLogFileSystem } from './error-log';
import { StrictModeError } from './strict-mode-error';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionPlanEntry,
  IngestionReporter,
  IngestionRunnerConfigOptions,
  IngestionRunnerExecutionResult,
  IngestionRunnerResult,
  IngestionStepContext,
  IngestionStepDescriptor,
  ExternalGap,
  Rejection,
  StepSummary,
} from './ingestion-runner.types';

const apiReadGuard: IngestionStepContext['readRecords'] = () => {
  throw new Error('Passo de origem API não consome registros CSV.');
};

export const ingestionStepDescriptors: readonly IngestionStepDescriptor[] = [
  { name: 'legislaturas', scope: 'single' },
  { name: 'deputados', scope: 'single' },
  { name: 'partidos', scope: 'annual', dataset: 'votacoesVotos' },
  { name: 'deputado_historico', scope: 'single', source: 'api' },
];

export type IngestionRunnerExecutionOptions = IngestionRunnerConfigOptions & {
  stepDescriptors?: readonly IngestionStepDescriptor[];
  createSteps?: (input: CreateStepsInput) => Promise<CreateStepsResult>;
  csvReader?: CsvReader;
  openSource?: (path: string) => Readable;
  sourceExists?: (path: string) => boolean;
  sourcePath?: (entry: IngestionPlanEntry) => string;
  errorLog?: { fileSystem: ErrorLogFileSystem; now: () => Date };
  reporter?: IngestionReporter;
};

export function runIngestionRunner(
  args: readonly string[],
  options: IngestionRunnerExecutionOptions = {},
): IngestionRunnerResult {
  const runnerArgs = args[0] === '--' ? args.slice(1) : args;
  const descriptors = options.stepDescriptors ?? ingestionStepDescriptors;
  const resolution = resolveIngestionRunnerConfig(runnerArgs, {
    currentYear: options.currentYear,
    stepNames: descriptors.map((step) => step.name),
  });

  if (!resolution.ok) {
    return { ok: false, message: resolution.message };
  }

  return {
    ok: true,
    config: resolution.config,
    plan: buildIngestionPlan(resolution.config, descriptors),
  };
}

export async function executeIngestionRunner(
  args: readonly string[],
  options: IngestionRunnerExecutionOptions = {},
): Promise<IngestionRunnerExecutionResult> {
  const result = runIngestionRunner(args, options);

  if (!result.ok) {
    options.reporter?.error?.(result.message);
    return { ok: false, exitCode: 1, message: result.message };
  }

  const { config, plan } = result;
  const csvReader = options.csvReader ?? readCsvRecords;
  const openSource = options.openSource ?? createReadStream;
  // A custom source opener owns existence; only the real file opener probes the disk.
  const sourceExists =
    options.sourceExists ?? (options.openSource ? () => true : existsSync);
  const sourcePathFor = options.sourcePath ?? defaultSourcePath;
  const createSteps = options.createSteps ?? createIngestionSteps;

  const { steps, close } = await createSteps({ dryRun: config.dryRun });

  const summaries: StepSummary[] = [];
  const rejections: Rejection[] = [];
  const externalGaps: ExternalGap[] = [];
  let aborted = false;

  try {
    for (const entry of plan) {
      const step = steps.find((candidate) => candidate.name === entry.stepName);

      if (step === undefined) {
        continue;
      }

      const startedAt = performance.now();
      let context: IngestionStepContext;

      if (step.source === 'api') {
        context = {
          dryRun: config.dryRun,
          strict: config.strict,
          sourceFile: step.name,
          readRecords: apiReadGuard,
        };
      } else {
        const sourcePath = sourcePathFor(entry);

        if (!sourceExists(sourcePath)) {
          const gap: ExternalGap = {
            file: basename(sourcePath),
            type: 'fonte_ausente',
            reference: sourcePath,
            message: `Fonte ausente: ${sourcePath}.`,
          };

          externalGaps.push(gap);
          summaries.push({
            read: 0,
            inserted: 0,
            updated: 0,
            ignored: 0,
            rejected: [],
            externalGaps: [gap],
            stepName: entry.stepName,
            year: entry.year,
            durationMs: performance.now() - startedAt,
          });

          if (entry.scope === 'single' || config.strict) {
            aborted = true;
            options.reporter?.error?.(gap.message);
            break;
          }

          continue;
        }

        context = {
          dryRun: config.dryRun,
          strict: config.strict,
          sourceFile: basename(sourcePath),
          readRecords: () => csvReader(openSource(sourcePath)),
        };
      }

      try {
        const stepResult = await step.run(context);

        summaries.push({
          ...stepResult,
          stepName: entry.stepName,
          year: entry.year,
          durationMs: performance.now() - startedAt,
        });
        rejections.push(...stepResult.rejected);
        externalGaps.push(...stepResult.externalGaps);
      } catch (error) {
        if (error instanceof StrictModeError) {
          if (error.rejection !== undefined) {
            rejections.push(error.rejection);
          }
          if (error.gap !== undefined) {
            externalGaps.push(error.gap);
          }
          aborted = true;
          break;
        }

        throw error;
      }
    }
  } finally {
    await close();
  }

  const errorLogPath =
    rejections.length > 0
      ? await writeErrorLog(rejections, {
          fileSystem: options.errorLog?.fileSystem ?? nodeErrorLogFileSystem,
          now: options.errorLog?.now ?? (() => new Date()),
        })
      : undefined;

  const summary = {
    steps: summaries,
    totalRead: sum(summaries, (step) => step.read),
    totalInserted: sum(summaries, (step) => step.inserted),
    totalUpdated: sum(summaries, (step) => step.updated),
    totalIgnored: sum(summaries, (step) => step.ignored),
    totalRejected: rejections.length,
    totalExternalGaps: externalGaps.length,
    dryRun: config.dryRun,
    strict: config.strict,
    years: config.years,
    errorLogPath,
    aborted,
  };

  reportSummary(summary, options.reporter);

  return { ok: true, exitCode: aborted ? 1 : 0, summary };
}

function defaultSourcePath(entry: IngestionPlanEntry): string {
  const dataset = entry.dataset ?? entry.stepName;

  if (entry.scope === 'single') {
    return `data/raw/${dataset}/${dataset}.csv`;
  }

  return `data/raw/${dataset}/${dataset}-${entry.year}.csv`;
}

function sum(
  summaries: readonly StepSummary[],
  pick: (summary: StepSummary) => number,
): number {
  return summaries.reduce((total, summary) => total + pick(summary), 0);
}

function reportSummary(
  summary: {
    steps: readonly StepSummary[];
    totalRead: number;
    totalInserted: number;
    totalUpdated: number;
    totalIgnored: number;
    totalRejected: number;
    totalExternalGaps: number;
    dryRun: boolean;
    strict: boolean;
    years: readonly number[];
    errorLogPath?: string;
    aborted?: boolean;
  },
  reporter: IngestionReporter | undefined,
): void {
  if (reporter === undefined) {
    return;
  }

  const mode = summary.dryRun
    ? 'dry-run'
    : summary.strict
      ? 'strict'
      : 'normal';

  for (const step of summary.steps) {
    const label =
      step.year === undefined ? step.stepName : `${step.stepName} ${step.year}`;

    if (step.externalGaps.length > 0) {
      reporter.log(
        `[${label}] fonte ausente: ${step.externalGaps
          .map((gap) => gap.reference)
          .join(', ')} (passo ignorado)`,
      );
      continue;
    }

    reporter.log(
      `[${label}] lidos ${step.read}, inseridos ${step.inserted}, atualizados ${step.updated}, ignorados ${step.ignored}, rejeitados ${step.rejected.length} (${Math.round(step.durationMs)}ms)`,
    );
  }

  reporter.log(
    `Resumo (${mode}): ${summary.totalRead} lidos, ${summary.totalInserted} inseridos, ${summary.totalUpdated} atualizados, ${summary.totalIgnored} ignorados, ${summary.totalRejected} rejeitados, ${summary.totalExternalGaps} lacunas de fonte.`,
  );

  if (summary.aborted) {
    reporter.log('Execução abortada.');
  }

  if (summary.errorLogPath !== undefined) {
    reporter.log(`Detalhes de erros em ${summary.errorLogPath}`);
  }
}
