import type { VotacaoNominal } from "@vota-comigo/shared-types";

import {
  formatShortDate,
  toComparadorLabel,
  toResultadoLabel,
  toResultadoTone,
  type ResultadoTone,
} from "./presentation";

const toneClasses: Record<ResultadoTone, string> = {
  success: "text-success bg-success-soft",
  danger: "text-danger bg-danger-soft",
  neutral: "text-muted bg-surface-muted",
};

export function VotacaoItem({ votacao }: { votacao: VotacaoNominal }) {
  const data = formatShortDate(votacao.data);
  const tone = toResultadoTone(votacao.resultado);
  const comparadorLabel = toComparadorLabel(votacao);

  return (
    <div className="grid gap-2 border-b border-border py-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted">{data ?? "—"}</span>
        <span
          className={`rounded-full px-3 py-1 text-sm ${toneClasses[tone]}`}
        >
          {toResultadoLabel(votacao.resultado)}
        </span>
      </div>
      {votacao.descricao ? (
        <p className="text-sm text-muted">{votacao.descricao}</p>
      ) : null}
      {comparadorLabel ? (
        <p className="text-xs text-primary-soft font-medium">
          {comparadorLabel}
        </p>
      ) : null}
    </div>
  );
}
