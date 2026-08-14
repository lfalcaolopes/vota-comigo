import type { StepSummary } from '../types/ingestion-pipeline-runner.types';

export type IngestionStepRunRow = {
  stepName: string;
  executedAt: string;
  recordsRead: number;
  firstYear: number | null;
  lastYear: number | null;
};

export function buildIngestionStepRunRows(
  summaries: readonly StepSummary[],
  input: { abortedStepName?: string; executedAt: string },
): readonly IngestionStepRunRow[] {
  const relevant = summaries.filter(
    (summary) => summary.stepName !== input.abortedStepName,
  );

  const stepNames: string[] = [];
  const groups = new Map<string, StepSummary[]>();

  for (const summary of relevant) {
    const group = groups.get(summary.stepName);
    if (group === undefined) {
      groups.set(summary.stepName, [summary]);
      stepNames.push(summary.stepName);
    } else {
      group.push(summary);
    }
  }

  return stepNames.map((stepName) => {
    const group = groups.get(stepName) ?? [];
    const recordsRead = group.reduce(
      (total, summary) => total + summary.read,
      0,
    );
    const yearsWithReads = group
      .filter((summary) => summary.read > 0 && summary.year !== undefined)
      .map((summary) => summary.year as number);

    return {
      stepName,
      executedAt: input.executedAt,
      recordsRead,
      firstYear: yearsWithReads.length > 0 ? Math.min(...yearsWithReads) : null,
      lastYear: yearsWithReads.length > 0 ? Math.max(...yearsWithReads) : null,
    };
  });
}
