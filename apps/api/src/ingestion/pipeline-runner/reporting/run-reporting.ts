import type {
  IngestionPlanEntry,
  IngestionReporter,
  IngestionPipelineRunnerConfig,
  IngestionSummary,
} from '../types/ingestion-pipeline-runner.types';

export function reportRunStart(
  config: IngestionPipelineRunnerConfig,
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

export function reportSummary(
  summary: Pick<
    IngestionSummary,
    | 'steps'
    | 'totalRead'
    | 'totalInserted'
    | 'totalUpdated'
    | 'totalIgnored'
    | 'totalRejected'
    | 'totalExternalGaps'
    | 'dryRun'
    | 'strict'
    | 'years'
    | 'errorLogPath'
    | 'gapLogPath'
    | 'aborted'
  >,
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

function describeMode(summary: {
  dryRun: boolean;
  strict: boolean;
}): 'dry-run' | 'strict' | 'normal' {
  if (summary.dryRun) {
    return 'dry-run';
  }

  return summary.strict ? 'strict' : 'normal';
}
