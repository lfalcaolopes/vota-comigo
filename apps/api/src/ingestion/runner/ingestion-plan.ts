import type {
  IngestionPlanEntry,
  IngestionRunnerConfig,
  IngestionStepDescriptor,
} from './ingestion-runner.types';

export function buildIngestionPlan(
  config: IngestionRunnerConfig,
  steps: readonly IngestionStepDescriptor[],
): IngestionPlanEntry[] {
  const selected =
    config.only === undefined
      ? steps
      : steps.filter((step) => config.only!.includes(step.name));

  return selected.flatMap((step): IngestionPlanEntry[] => {
    const base =
      step.dataset === undefined
        ? { stepName: step.name, scope: step.scope }
        : { stepName: step.name, scope: step.scope, dataset: step.dataset };

    if (step.scope === 'single') {
      return [base];
    }

    return config.years.map((year) => ({ ...base, year }));
  });
}
