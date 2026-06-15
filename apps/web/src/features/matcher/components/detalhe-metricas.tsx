import type { MatcherDetalheMetrics } from "@vota-comigo/shared-types";

import { formatPercentual } from "../lib/matcher-presentation";

type DetalheMetricasProps = {
  metrics: MatcherDetalheMetrics;
};

export function DetalheMetricas({ metrics }: DetalheMetricasProps) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-4 rounded-lg border border-border bg-surface-muted p-4">
      <Stat
        emphasis
        label="Compatibilidade"
        value={formatPercentual(metrics.compatibilidadeBruta)}
      />
      <Stat
        label="Amostra comparável"
        value={String(metrics.amostraComparavel)}
      />
      <Stat
        label="Cobertura de exercício"
        value={String(metrics.coberturaExercicio)}
      />
    </dl>
  );
}

type StatProps = {
  emphasis?: boolean;
  label: string;
  value: string;
};

function Stat({ emphasis = false, label, value }: StatProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={
          emphasis
            ? "text-2xl font-[680] tabular-nums text-ink"
            : "text-base font-[680] tabular-nums text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
