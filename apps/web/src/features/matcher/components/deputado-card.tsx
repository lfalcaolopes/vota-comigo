import type { MatcherDeputadoResumo } from "@vota-comigo/shared-types";

import { Badge } from "@/shared/ui";

import {
  formatPercentual,
  toAlertaLabel,
  toAmostraComparavelLabel,
  toAtividadeLabel,
  toAtividadeTone,
} from "../lib/matcher-presentation";
import { DeputadoAvatar } from "./deputado-avatar";

type DeputadoCardProps = {
  deputado: MatcherDeputadoResumo;
  totalPosicoesComputaveis: number;
  onOpen: (externalIdDeputado: number) => void;
};

export function DeputadoCard({ deputado, totalPosicoesComputaveis, onOpen }: DeputadoCardProps) {
  const percentualLabel = formatPercentual(deputado.compatibilidadeBruta);
  const amostraLabel = toAmostraComparavelLabel(deputado, totalPosicoesComputaveis);
  const atividadeLabel = toAtividadeLabel(deputado.emAtividade);
  const atividadeTone = toAtividadeTone(deputado.emAtividade);
  const hasAlertaAmostra = deputado.alertas.includes("amostra_pequena");

  return (
    <li className="border-b border-border">
      <button
        className="group grid w-full cursor-pointer gap-3 py-3 text-left transition-colors duration-[180ms] ease-standard hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => onOpen(deputado.externalIdDeputado)}
        type="button"
      >
      <div className="flex items-center gap-3">
        <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
        <div className="min-w-0 flex-1">
          <p className="font-[650] text-ink">{deputado.nome ?? "Sem nome"}</p>
          <p className="text-sm text-muted">
            {deputado.partido ?? "—"} · {deputado.siglaUf}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <p className="text-lg font-[680] leading-none tabular-nums text-ink">
            <span className="sr-only">Compatibilidade </span>
            {percentualLabel}
          </p>
          <p className="mt-1 text-xs text-muted">{amostraLabel}</p>
        </div>
        <svg
          aria-hidden="true"
          className="shrink-0 text-subtle transition-[transform,color] duration-[180ms] ease-standard group-hover:translate-x-0.5 group-hover:text-muted"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="m6 4 4 4-4 4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={atividadeTone}>
          {deputado.emAtividade ? (
            <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
              <circle cx="6" cy="6" fill="currentColor" r="4" />
            </svg>
          ) : (
            <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
          {atividadeLabel}
        </Badge>

        {hasAlertaAmostra && (
          <Badge tone="warning">
            <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
              <path
                d="M6 1.5 L11 10.5 H1 Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path d="M6 5v2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              <circle cx="6" cy="9" fill="currentColor" r="0.75" />
            </svg>
            {toAlertaLabel("amostra_pequena")}
          </Badge>
        )}
      </div>
      </button>
    </li>
  );
}
