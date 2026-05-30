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
    if (step.scope === 'single') {
      return [{ stepName: step.name, scope: step.scope }];
    }

    return config.years.map((year) => ({
      stepName: step.name,
      scope: step.scope,
      year,
    }));
  });
}
