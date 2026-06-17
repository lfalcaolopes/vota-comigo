import type { MatcherDetalheMetrics } from "@vota-comigo/shared-types";

import {
  AMOSTRA_PEQUENA_CAVEAT,
  formatAmostraComparavel,
} from "../../lib/matcher-detalhe-presentation";
import { formatPercentual } from "../../lib/matcher-presentation";
import { MetricasGlossario } from "./metricas-glossario";

type DetalheMetricasProps = {
  metrics: MatcherDetalheMetrics;
};

export function DetalheMetricas({ metrics }: DetalheMetricasProps) {
  const amostraPequena = metrics.alertas.includes("amostra_pequena");

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4">
      <dl className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted">Compatibilidade</dt>
          <dd className="text-2xl font-[680] leading-tight tabular-nums text-ink">
            {formatPercentual(metrics.compatibilidadeBruta)}
          </dd>
          <p className="text-xs text-muted">
            {formatAmostraComparavel(metrics.amostraComparavel)}
          </p>
        </div>
        <Stat
          label="Cobertura de exercício"
          value={String(metrics.coberturaExercicio)}
        />
      </dl>

      {amostraPequena ? (
        <p className="text-sm leading-normal text-warning-strong">
          {AMOSTRA_PEQUENA_CAVEAT}
        </p>
      ) : null}

      <MetricasGlossario />
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-[680] tabular-nums text-ink">{value}</dd>
    </div>
  );
}
