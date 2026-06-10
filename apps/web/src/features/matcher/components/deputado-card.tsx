import type { MatcherDeputadoResumo } from "@vota-comigo/shared-types";

import { Badge } from "@/shared/ui";

import {
  toAlertaLabel,
  toAtividadeLabel,
  toAtividadeTone,
  toCompatibilidadeAmostraLabel,
} from "../lib/matcher-presentation";
import { DeputadoAvatar } from "./deputado-avatar";

type DeputadoCardProps = {
  deputado: MatcherDeputadoResumo;
  totalPosicoesComputaveis: number;
};

export function DeputadoCard({ deputado, totalPosicoesComputaveis }: DeputadoCardProps) {
  const compatibilidadeLabel = toCompatibilidadeAmostraLabel(deputado, totalPosicoesComputaveis);
  const atividadeLabel = toAtividadeLabel(deputado.emAtividade);
  const atividadeTone = toAtividadeTone(deputado.emAtividade);
  const hasAlertaAmostra = deputado.alertas.includes("amostra_pequena");

  return (
    <li className="grid gap-3 border-b border-border py-3">
      <div className="flex items-center gap-3">
        <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
        <div className="min-w-0">
          <p className="font-[650] text-ink">{deputado.nome ?? "Sem nome"}</p>
          <p className="text-sm text-muted">
            {deputado.partido ?? "—"} · {deputado.siglaUf}
          </p>
        </div>
      </div>

      <p className="text-sm font-[650] text-ink">{compatibilidadeLabel}</p>

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
    </li>
  );
}
