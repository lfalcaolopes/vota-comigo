import type {
  IngestionPlanEntry,
  IngestionRunnerConfig,
  IngestionStepDescriptor,
} from './ingestion-runner.types';

export function buildIngestionPlan(
  config: IngestionRunnerConfig,
  steps: readonly IngestionStepDescriptor[],
): IngestionPlanEntry[] {
  // Sem --only, passos manuais ficam fora da execução padrão; com --only, rodam
  // apenas quando nomeados explicitamente.
  const selected =
    config.only === undefined
      ? steps.filter((step) => step.manual !== true)
      : steps.filter((step) => config.only!.includes(step.name));

  return selected.flatMap((step): IngestionPlanEntry[] => {
    const base: IngestionPlanEntry = {
      stepName: step.name,
      scope: step.scope,
      ...(step.dataset === undefined ? {} : { dataset: step.dataset }),
      ...(step.companionDatasets === undefined
        ? {}
        : { companionDatasets: step.companionDatasets }),
    };

    if (step.scope === 'single') {
      return [base];
    }

    return config.years.map((year) => ({ ...base, year }));
  });
}
