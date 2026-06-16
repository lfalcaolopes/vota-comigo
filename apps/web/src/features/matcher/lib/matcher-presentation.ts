import type { AlertaMatcher, MatcherDeputadoResumo } from "@vota-comigo/shared-types";

export {
  getInitials,
  toAtividadeLabel,
  toAtividadeTone,
} from "@/shared/deputado/presentation";

export const SEM_BOM_MATCH_BANNER_TITLE =
  "Nenhum deputado com boa compatibilidade";
export const SEM_BOM_MATCH_BANNER_BODY =
  "Candidatos que ainda não têm histórico de votação federal podem estar mais alinhados com suas posições. Eleições são o momento de renovar a representação.";

export function formatPercentual(value: number): string {
  return `${Math.round(value)}%`;
}

export function toAmostraComparavelLabel(
  deputado: MatcherDeputadoResumo,
  totalPosicoesComputaveis: number,
): string {
  return `${deputado.amostraComparavel} de ${totalPosicoesComputaveis} votações comparáveis`;
}

export function toAlertaLabel(alerta: AlertaMatcher): string {
  if (alerta === "amostra_pequena") return "Amostra pequena";
  return alerta;
}
