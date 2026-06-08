import { basename } from 'node:path';
import type { Readable } from 'node:stream';

import type { CsvReader } from '../sources/csv-reader';
import { StrictModeError } from '../errors/strict-mode-error';
import {
  logStepGap,
  logStepResult,
  logStepStart,
  stepLabel,
} from '../reporting/step-logging';
import type {
  ExternalGap,
  IngestionPlanEntry,
  IngestionReporter,
  IngestionPipelineRunnerConfig,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepSummary,
} from '../types/ingestion-pipeline-runner.types';

export type StepExecutionResult = {
  summary?: StepSummary;
  rejections: readonly Rejection[];
  externalGaps: readonly ExternalGap[];
  aborted: boolean;
};

export type IngestionStepExecutor = {
  execute(
    entry: IngestionPlanEntry,
    step: IngestionStep,
  ): Promise<StepExecutionResult>;
};

export type IngestionStepExecutorDeps = {
  config: IngestionPipelineRunnerConfig;
  csvReader: CsvReader;
  openSource(path: string): Readable;
  sourceExists(path: string): boolean;
  sourcePathFor(entry: IngestionPlanEntry): string;
  reporter?: IngestionReporter;
};

const apiReadGuard: IngestionStepContext['readRecords'] = () => {
  throw new Error('Passo de origem API não consome registros CSV.');
};

export function createIngestionStepExecutor(
  deps: IngestionStepExecutorDeps,
): IngestionStepExecutor {
  return {
    async execute(
      entry: IngestionPlanEntry,
      step: IngestionStep,
    ): Promise<StepExecutionResult> {
      const label = stepLabel(entry.stepName, entry.year);
      const startedAt = performance.now();
      const context = createStepContext(entry, step, deps);

      if (context === undefined) {
        const sourcePath = deps.sourcePathFor(entry);
        const gap: ExternalGap = {
          file: basename(sourcePath),
          type: 'fonte_ausente',
          reference: sourcePath,
          message: `Fonte ausente: ${sourcePath}.`,
        };
        const aborted = entry.scope === 'single' || deps.config.strict;
        const summary: StepSummary = {
          read: 0,
          inserted: 0,
          updated: 0,
          ignored: 0,
          rejected: [],
          externalGaps: [gap],
          stepName: entry.stepName,
          year: entry.year,
          durationMs: performance.now() - startedAt,
        };

        logStepGap(deps.reporter, label, [gap.reference]);

        if (aborted) {
          deps.reporter?.error?.(gap.message);
        }

        return {
          summary,
          rejections: [],
          externalGaps: [gap],
          aborted,
        };
      }

      const sourceDesc =
        context.sourceFile === entry.stepName ? undefined : context.sourceFile;
      logStepStart(deps.reporter, label, sourceDesc);

      try {
        const stepResult = await step.run(context);
        const durationMs = performance.now() - startedAt;
        const summary: StepSummary = {
          ...stepResult,
          stepName: entry.stepName,
          year: entry.year,
          durationMs,
        };

        logStepResult(deps.reporter, label, stepResult, durationMs);

        return {
          summary,
          rejections: stepResult.rejected,
          externalGaps: stepResult.externalGaps,
          aborted: false,
        };
      } catch (error) {
        if (error instanceof StrictModeError) {
          return {
            rejections: error.rejection === undefined ? [] : [error.rejection],
            externalGaps: error.gap === undefined ? [] : [error.gap],
            aborted: true,
          };
        }

        throw error;
      }
    },
  };
}

function createStepContext(
  entry: IngestionPlanEntry,
  step: IngestionStep,
  deps: IngestionStepExecutorDeps,
): IngestionStepContext | undefined {
  const base = {
    dryRun: deps.config.dryRun,
    strict: deps.config.strict,
    debug: deps.config.debug,
    limit: deps.config.limit,
    reporter: deps.reporter,
  };

  if (step.source === 'api' || step.source === 'db') {
    return {
      ...base,
      sourceFile: step.name,
      readRecords: apiReadGuard,
    };
  }

  if (step.source === 'derived') {
    return {
      ...base,
      sourceFile: step.name,
      readRecords: apiReadGuard,
      years: deps.config.years,
      readDataset: (dataset, year) => {
        const datasetPath = deps.sourcePathFor({
          stepName: dataset,
          scope: 'annual',
          dataset,
          year,
        });

        if (!deps.sourceExists(datasetPath)) {
          return undefined;
        }

        return () => deps.csvReader(deps.openSource(datasetPath));
      },
    };
  }

  const sourcePath = deps.sourcePathFor(entry);

  if (!deps.sourceExists(sourcePath)) {
    return undefined;
  }

  return {
    ...base,
    sourceFile: basename(sourcePath),
    year: entry.year,
    readRecords: () => deps.csvReader(deps.openSource(sourcePath)),
    readCompanion: (dataset) => {
      const companionPath = deps.sourcePathFor({ ...entry, dataset });

      if (!deps.sourceExists(companionPath)) {
        return undefined;
      }

      return () => deps.csvReader(deps.openSource(companionPath));
    },
  };
}
