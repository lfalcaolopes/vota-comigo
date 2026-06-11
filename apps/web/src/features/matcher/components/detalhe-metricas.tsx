import type { MatcherDetalheMetrics } from "@vota-comigo/shared-types";

import { formatPercentual } from "../lib/matcher-presentation";

type DetalheMetricasProps = {
  metrics: MatcherDetalheMetrics;
};

type MetricItemProps = {
  label: string;
  value: string;
};

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="grid gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-base font-[680] text-ink">{value}</p>
    </div>
  );
}

export function DetalheMetricas({ metrics }: DetalheMetricasProps) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface-muted p-4 sm:grid-cols-3">
      <MetricItem
        label="Concordâncias"
        value={String(metrics.totalConcordancias)}
      />
      <MetricItem
        label="Discordâncias"
        value={String(metrics.totalDiscordancias)}
      />
      <MetricItem
        label="Fora do denominador"
        value={String(metrics.totalForaDoDenominador)}
      />
      <MetricItem
        label="Amostra comparável"
        value={String(metrics.amostraComparavel)}
      />
      <MetricItem
        label="Cobertura de exercício"
        value={String(metrics.coberturaExercicio)}
      />
      <MetricItem
        label="Compatibilidade"
        value={formatPercentual(metrics.compatibilidadeBruta)}
      />
    </div>
  );
}
