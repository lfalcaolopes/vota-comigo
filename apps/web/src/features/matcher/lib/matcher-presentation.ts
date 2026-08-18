import type {
  AlertaMatcher,
  EscopoMatcher,
  MatcherDeputadoResumo,
  SiglaUf,
} from "@vota-comigo/shared-types";

import { toEstadoLabel } from "@/shared/deputado/presentation";

export {
  getInitials,
  toAtividadeLabel,
  toAtividadeTone,
} from "@/shared/deputado/presentation";

export function formatPercentual(value: number): string {
  return `${Math.round(value)}%`;
}

export function toAmostraComparavelLabel(
  deputado: MatcherDeputadoResumo,
  totalPosicoesComputaveis: number,
): string {
  return `${deputado.amostraComparavel} das suas ${totalPosicoesComputaveis} respostas entraram na conta`;
}

export function toCopyContextLabel({
  escopo,
  siglaUf,
  totalProposicoes,
}: {
  escopo: EscopoMatcher;
  siglaUf: SiglaUf | null;
  totalProposicoes: number;
}): string {
  const proposicoes = `${totalProposicoes} ${totalProposicoes === 1 ? "proposta" : "propostas"}`;
  const abrangencia =
    escopo === "nacional"
      ? "Brasil"
      : siglaUf === null
        ? null
        : toEstadoLabel(siglaUf);

  return abrangencia === null ? proposicoes : `${proposicoes} · ${abrangencia}`;
}

export function toAlertaLabel(alerta: AlertaMatcher): string {
  if (alerta === "amostra_pequena") return "Poucos votos em comum";
  return alerta;
}
