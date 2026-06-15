import type { AlertaMatcher, MatcherDeputadoResumo } from "@vota-comigo/shared-types";

import type { BadgeTone } from "@/shared/ui";

export const SEM_BOM_MATCH_BANNER_TITLE =
  "Nenhum deputado com boa compatibilidade";
export const SEM_BOM_MATCH_BANNER_BODY =
  "Candidatos que ainda não têm histórico de votação federal podem estar mais alinhados com suas posições. Eleições são o momento de renovar a representação.";

const PARTICLES = new Set(["de", "da", "do", "dos", "das", "e", "e"]);

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

export function toAtividadeLabel(emAtividade: boolean): string {
  return emAtividade ? "Em atividade" : "Mandato encerrado";
}

export function toAtividadeTone(emAtividade: boolean): BadgeTone {
  return emAtividade ? "success" : "neutral";
}

export function getInitials(nome: string | null): string {
  if (!nome) return "?";

  const words = nome.trim().split(/\s+/).filter((w) => w.length > 0);
  const meaningful = words.filter((w) => !PARTICLES.has(w.toLowerCase()));

  if (meaningful.length === 0) return "?";

  if (meaningful.length === 1) {
    return meaningful[0].charAt(0).toUpperCase();
  }

  const first = meaningful[0].charAt(0).toUpperCase();
  const last = meaningful[meaningful.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}
