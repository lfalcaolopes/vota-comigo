import { createReadStream, existsSync } from 'node:fs';
import type { Readable } from 'node:stream';

import { createIngestionStepExecutor } from './composition/ingestion-step-executor';
import { createIngestionSteps } from './composition/ingestion-steps';
import { resolveIngestionPipelineRunnerConfig } from './config/ingestion-pipeline-runner.config';
import { writeErrorLog } from './logs/error-log';
import type { ErrorLogFileSystem } from './logs/error-log';
import { writeGapLog } from './logs/gap-log';
import { readGapLog, selectRetryReferences } from './logs/gap-log-reader';
import type { GapLogReaderFileSystem } from './logs/gap-log-reader';
import { nodeErrorLogFileSystem } from './logs/node-error-log-file-system';
import { nodeGapLogReaderFileSystem } from './logs/node-gap-log-reader-file-system';
import { buildIngestionPlan } from './plan/ingestion-plan';
import { ingestionStepDescriptors } from './plan/ingestion-step-descriptors';
import { reportRunStart, reportSummary } from './reporting/run-reporting';
import { readCsvRecords } from './sources/csv-reader';
import type { CsvReader } from './sources/csv-reader';
import { defaultSourcePath } from './sources/source-path';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionPlanEntry,
  IngestionReporter,
  IngestionPipelineRunnerConfig,
  IngestionPipelineRunnerConfigOptions,
  IngestionPipelineRunnerExecutionResult,
  IngestionPipelineRunnerResult,
  IngestionStepDescriptor,
  IngestionSummary,
  ExternalGap,
  Rejection,
  StepSummary,
} from './types/ingestion-pipeline-runner.types';

export type IngestionPipelineRunnerExecutionOptions =
  IngestionPipelineRunnerConfigOptions & {
    stepDescriptors?: readonly IngestionStepDescriptor[];
    createSteps?: (input: CreateStepsInput) => Promise<CreateStepsResult>;
    csvReader?: CsvReader;
    openSource?: (path: string) => Readable;
    sourceExists?: (path: string) => boolean;
    sourcePath?: (entry: IngestionPlanEntry) => string;
    errorLog?: { fileSystem: ErrorLogFileSystem; now: () => Date };
    gapLogReader?: { fileSystem: GapLogReaderFileSystem };
    reporter?: IngestionReporter;
  };

export function runIngestionPipelineRunner(
  args: readonly string[],
  options: IngestionPipelineRunnerExecutionOptions = {},
): IngestionPipelineRunnerResult {
  const pipelineRunnerArgs = args[0] === '--' ? args.slice(1) : args;
  const descriptors = options.stepDescriptors ?? ingestionStepDescriptors;
  const resolution = resolveIngestionPipelineRunnerConfig(pipelineRunnerArgs, {
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

export async function executeIngestionPipelineRunner(
  args: readonly string[],
  options: IngestionPipelineRunnerExecutionOptions = {},
): Promise<IngestionPipelineRunnerExecutionResult> {
  const result = runIngestionPipelineRunner(args, options);

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

  let retryExternalIds: readonly number[] | undefined;

  if (config.retryGapsPath !== undefined) {
    const gaps = await readGapLog(
      config.retryGapsPath,
      options.gapLogReader?.fileSystem ?? nodeGapLogReaderFileSystem,
    );
    retryExternalIds = selectRetryReferences(gaps);

    if (retryExternalIds.length === 0) {
      options.reporter?.log(
        `Nenhum registro para reprocessar em ${config.retryGapsPath}.`,
      );
      return { ok: true, exitCode: 0, summary: emptySummary(config) };
    }

    options.reporter?.log(
      `Reprocessando ${retryExternalIds.length} registro(s) de ${config.retryGapsPath}.`,
    );
  }

  const { steps, close } = await createSteps({
    dryRun: config.dryRun,
    retryExternalIds,
    refetchHistorico: config.refetchHistorico,
  });
  const stepsByName = new Map(steps.map((step) => [step.name, step]));
  const executor = createIngestionStepExecutor({
    config,
    csvReader,
    openSource,
    sourceExists,
    sourcePathFor,
    reporter: options.reporter,
  });

  const summaries: StepSummary[] = [];
  const rejections: Rejection[] = [];
  const externalGaps: ExternalGap[] = [];
  let aborted = false;

  reportRunStart(config, plan, options.reporter);

  try {
    for (const entry of plan) {
      const step = stepsByName.get(entry.stepName);

      if (step === undefined) {
        continue;
      }

      const stepResult = await executor.execute(entry, step);

      if (stepResult.summary !== undefined) {
        summaries.push(stepResult.summary);
      }
      rejections.push(...stepResult.rejections);
      externalGaps.push(...stepResult.externalGaps);

      if (stepResult.aborted) {
        aborted = true;
        break;
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

  const gapLogPath =
    externalGaps.length > 0
      ? await writeGapLog(externalGaps, {
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
    gapLogPath,
    aborted,
  };

  reportSummary(summary, options.reporter);

  return { ok: true, exitCode: aborted ? 1 : 0, summary };
}

function emptySummary(config: IngestionPipelineRunnerConfig): IngestionSummary {
  return {
    steps: [],
    totalRead: 0,
    totalInserted: 0,
    totalUpdated: 0,
    totalIgnored: 0,
    totalRejected: 0,
    totalExternalGaps: 0,
    dryRun: config.dryRun,
    strict: config.strict,
    years: config.years,
    aborted: false,
  };
}

function sum(
  summaries: readonly StepSummary[],
  pick: (summary: StepSummary) => number,
): number {
  return summaries.reduce((total, summary) => total + pick(summary), 0);
}
