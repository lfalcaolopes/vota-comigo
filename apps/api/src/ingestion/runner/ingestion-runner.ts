import { basename } from 'node:path';
import { createReadStream } from 'node:fs';
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
  IngestionStepDescriptor,
  Rejection,
  StepSummary,
} from './ingestion-runner.types';

export const ingestionStepDescriptors: readonly IngestionStepDescriptor[] = [
  { name: 'legislaturas', scope: 'single' },
];

export type IngestionRunnerExecutionOptions = IngestionRunnerConfigOptions & {
  stepDescriptors?: readonly IngestionStepDescriptor[];
  createSteps?: (input: CreateStepsInput) => Promise<CreateStepsResult>;
  csvReader?: CsvReader;
  openSource?: (path: string) => Readable;
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
  const sourcePathFor = options.sourcePath ?? defaultSourcePath;
  const createSteps = options.createSteps ?? createIngestionSteps;

  const { steps, close } = await createSteps({ dryRun: config.dryRun });

  const summaries: StepSummary[] = [];
  const rejections: Rejection[] = [];
  let aborted = false;

  try {
    for (const entry of plan) {
      const step = steps.find((candidate) => candidate.name === entry.stepName);

      if (step === undefined) {
        continue;
      }

      const sourcePath = sourcePathFor(entry);
      const startedAt = performance.now();

      try {
        const stepResult = await step.run({
          dryRun: config.dryRun,
          strict: config.strict,
          sourceFile: basename(sourcePath),
          readRecords: () => csvReader(openSource(sourcePath)),
        });

        summaries.push({
          ...stepResult,
          stepName: entry.stepName,
          year: entry.year,
          durationMs: performance.now() - startedAt,
        });
        rejections.push(...stepResult.rejected);
      } catch (error) {
        if (error instanceof StrictModeError) {
          rejections.push(error.rejection);
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
  const dataset = entry.stepName;

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
    reporter.log(
      `[${label}] lidos ${step.read}, inseridos ${step.inserted}, atualizados ${step.updated}, ignorados ${step.ignored}, rejeitados ${step.rejected.length} (${Math.round(step.durationMs)}ms)`,
    );
  }

  reporter.log(
    `Resumo (${mode}): ${summary.totalRead} lidos, ${summary.totalInserted} inseridos, ${summary.totalUpdated} atualizados, ${summary.totalIgnored} ignorados, ${summary.totalRejected} rejeitados.`,
  );

  if (summary.aborted) {
    reporter.log('Execução abortada pelo modo estrito.');
  }

  if (summary.errorLogPath !== undefined) {
    reporter.log(`Detalhes de erros em ${summary.errorLogPath}`);
  }
}
