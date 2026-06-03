import { basename } from 'node:path';
import { createReadStream, existsSync } from 'node:fs';
import type { Readable } from 'node:stream';

import { readCsvRecords } from './csv-reader';
import type { CsvReader } from './csv-reader';
import { buildIngestionPlan } from './ingestion-plan';
import { resolveIngestionRunnerConfig } from './ingestion-runner.config';
import { writeErrorLog } from './error-log';
import { writeGapLog } from './gap-log';
import { readGapLog, selectRetryReferences } from './gap-log-reader';
import type { GapLogReaderFileSystem } from './gap-log-reader';
import { createIngestionSteps } from './ingestion-steps';
import {
  logStepGap,
  logStepResult,
  logStepStart,
  stepLabel,
} from './step-logging';
import { nodeErrorLogFileSystem } from './node-error-log-file-system';
import { nodeGapLogReaderFileSystem } from './node-gap-log-reader-file-system';
import type { ErrorLogFileSystem } from './error-log';
import { StrictModeError } from './strict-mode-error';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionPlanEntry,
  IngestionReporter,
  IngestionRunnerConfig,
  IngestionRunnerConfigOptions,
  IngestionRunnerExecutionResult,
  IngestionRunnerResult,
  IngestionStepContext,
  IngestionStepDescriptor,
  IngestionSummary,
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
  {
    name: 'votacoes',
    scope: 'annual',
    companionDatasets: ['votacoesVotos'],
  },
  { name: 'votacao_votos', scope: 'annual', dataset: 'votacoesVotos' },
  { name: 'proposicoes', scope: 'single', source: 'derived' },
  { name: 'votacao_proposicao', scope: 'single', source: 'derived' },
  { name: 'tema', scope: 'single', source: 'derived' },
  { name: 'deputado_historico', scope: 'single', source: 'api', manual: true },
  { name: 'sanity', scope: 'single', source: 'db' },
];

export type IngestionRunnerExecutionOptions = IngestionRunnerConfigOptions & {
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

  const summaries: StepSummary[] = [];
  const rejections: Rejection[] = [];
  const externalGaps: ExternalGap[] = [];
  let aborted = false;

  reportRunStart(config, plan, options.reporter);

  try {
    for (const entry of plan) {
      const step = steps.find((candidate) => candidate.name === entry.stepName);

      if (step === undefined) {
        continue;
      }

      const label = stepLabel(entry.stepName, entry.year);
      const startedAt = performance.now();
      let context: IngestionStepContext;

      if (step.source === 'api' || step.source === 'db') {
        context = {
          dryRun: config.dryRun,
          strict: config.strict,
          debug: config.debug,
          limit: config.limit,
          sourceFile: step.name,
          reporter: options.reporter,
          readRecords: apiReadGuard,
        };
      } else if (step.source === 'derived') {
        // Passo auto-gerido: varre múltiplos anos por conta própria, sem fonte
        // única em disco. O runner só expõe os anos em escopo e um abridor de
        // datasets anuais arbitrários.
        context = {
          dryRun: config.dryRun,
          strict: config.strict,
          debug: config.debug,
          limit: config.limit,
          sourceFile: step.name,
          reporter: options.reporter,
          readRecords: apiReadGuard,
          years: config.years,
          readDataset: (dataset, year) => {
            const datasetPath = sourcePathFor({
              stepName: dataset,
              scope: 'annual',
              dataset,
              year,
            });

            if (!sourceExists(datasetPath)) {
              return undefined;
            }

            return () => csvReader(openSource(datasetPath));
          },
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
          logStepGap(options.reporter, label, [gap.reference]);

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
          debug: config.debug,
          limit: config.limit,
          sourceFile: basename(sourcePath),
          year: entry.year,
          reporter: options.reporter,
          readRecords: () => csvReader(openSource(sourcePath)),
          readCompanion: (dataset) => {
            const companionPath = sourcePathFor({ ...entry, dataset });

            if (!sourceExists(companionPath)) {
              return undefined;
            }

            return () => csvReader(openSource(companionPath));
          },
        };
      }

      const sourceDesc =
        context.sourceFile === entry.stepName ? undefined : context.sourceFile;
      logStepStart(options.reporter, label, sourceDesc);

      try {
        const stepResult = await step.run(context);
        const durationMs = performance.now() - startedAt;

        summaries.push({
          ...stepResult,
          stepName: entry.stepName,
          year: entry.year,
          durationMs,
        });
        rejections.push(...stepResult.rejected);
        externalGaps.push(...stepResult.externalGaps);
        logStepResult(options.reporter, label, stepResult, durationMs);
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

function emptySummary(config: IngestionRunnerConfig): IngestionSummary {
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

function describeMode(summary: {
  dryRun: boolean;
  strict: boolean;
}): 'dry-run' | 'strict' | 'normal' {
  if (summary.dryRun) {
    return 'dry-run';
  }

  return summary.strict ? 'strict' : 'normal';
}

function reportRunStart(
  config: IngestionRunnerConfig,
  plan: readonly IngestionPlanEntry[],
  reporter: IngestionReporter | undefined,
): void {
  if (reporter === undefined) {
    return;
  }

  const mode = describeMode(config);
  const years = config.years;
  const window =
    years.length === 0
      ? 'sem janela anual'
      : `anos ${years[0]}-${years[years.length - 1]}`;
  const limit = config.limit === undefined ? '' : `, limite ${config.limit}`;

  reporter.log(
    `Iniciando ingestão (${mode}): ${window}, ${plan.length} passos planejados${limit}.`,
  );
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
    gapLogPath?: string;
    aborted?: boolean;
  },
  reporter: IngestionReporter | undefined,
): void {
  if (reporter === undefined) {
    return;
  }

  const mode = describeMode(summary);

  reporter.log(
    `Resumo (${mode}): ${summary.totalRead} lidos, ${summary.totalInserted} inseridos, ${summary.totalUpdated} atualizados, ${summary.totalIgnored} ignorados, ${summary.totalRejected} rejeitados, ${summary.totalExternalGaps} lacunas de fonte.`,
  );

  if (summary.aborted) {
    reporter.log('Execução abortada.');
  }

  if (summary.errorLogPath !== undefined) {
    reporter.log(`Detalhes de erros em ${summary.errorLogPath}`);
  }

  if (summary.gapLogPath !== undefined) {
    reporter.log(`Detalhes de lacunas de fonte em ${summary.gapLogPath}`);
  }
}
