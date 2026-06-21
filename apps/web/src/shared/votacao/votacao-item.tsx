import type { VotacaoNominal } from "@vota-comigo/shared-types";

import {
  formatShortDate,
  toComparadorLabel,
  toPlacarCategorias,
  toPlacarResumidoLabel,
  toResultadoLabel,
  toResultadoTone,
  type PlacarCategoria,
  type ResultadoTone,
} from "./presentation";

const toneClasses: Record<ResultadoTone, string> = {
  success: "text-success bg-success-soft",
  danger: "text-danger bg-danger-soft",
  neutral: "text-muted bg-surface-muted",
};

const dotClasses: Record<PlacarCategoria["tone"], string> = {
  success: "bg-success",
  danger: "bg-danger",
};

export function VotacaoItem({ votacao }: { votacao: VotacaoNominal }) {
  const data = formatShortDate(votacao.data);
  const tone = toResultadoTone(votacao.resultado);
  const comparadorLabel = toComparadorLabel(votacao);
  const categorias = toPlacarCategorias(votacao.placar);
  const resumidoLabel = toPlacarResumidoLabel(votacao.placar);

  return (
    <div className="grid gap-3 border-b border-border py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-muted">{data ?? "—"}</span>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${toneClasses[tone]}`}
        >
          {toResultadoLabel(votacao.resultado)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {categorias.map((categoria) => (
            <span
              key={categoria.label}
              className="inline-flex items-center gap-1.5 rounded bg-surface-muted px-2.5 py-1 text-sm"
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${dotClasses[categoria.tone]}`}
              />
              <span className="text-xs text-muted">{categoria.label}</span>
              <span className="font-semibold text-ink tabular-nums">
                {categoria.votos}
              </span>
            </span>
          ))}
        </div>
        {resumidoLabel ? (
          <span className="text-xs text-muted">{resumidoLabel}</span>
        ) : null}
      </div>
      {votacao.descricao ? (
        <p className="text-sm text-muted text-pretty">{votacao.descricao}</p>
      ) : null}
      {comparadorLabel ? (
        <p className="text-xs text-primary font-medium">{comparadorLabel}</p>
      ) : null}
    </div>
  );
}
