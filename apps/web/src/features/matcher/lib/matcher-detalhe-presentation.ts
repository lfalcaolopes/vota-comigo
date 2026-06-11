import type {
  DeputadoVotacaoClassification,
  MatcherEffect,
  MatcherVotoDetalhe,
} from "@vota-comigo/shared-types";

export const FORA_DO_DENOMINADOR_EXPLICACAO =
  "Estas proposições não entraram no cálculo de compatibilidade porque o deputado estava fora de exercício ou teve impedimento regimental na votação.";

export function groupVotosByMatcherEffect(
  votos: MatcherVotoDetalhe[],
): Record<MatcherEffect, MatcherVotoDetalhe[]> {
  const groups: Record<MatcherEffect, MatcherVotoDetalhe[]> = {
    concordancia: [],
    discordancia: [],
    fora_do_denominador: [],
  };

  for (const v of votos) {
    groups[v.matcherEffect] = [...groups[v.matcherEffect], v];
  }

  return groups;
}

const SITUACAO_LABELS: Record<DeputadoVotacaoClassification, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  ausencia_sem_motivo_conhecido: "Ausência sem motivo conhecido",
  fora_de_exercicio: "Fora de exercício",
  artigo_17: "Artigo 17",
  voto_nao_informado: "Voto não informado",
  lacuna_de_dados: "Sem dados",
};

export function toSituacaoLabel(
  situacao: DeputadoVotacaoClassification,
): string {
  return SITUACAO_LABELS[situacao];
}

export function toPosicaoLabel(posicao: "aprovar" | "rejeitar"): string {
  return posicao === "aprovar" ? "A favor da aprovação" : "Contra a aprovação";
}

export function toMatcherEffectLabel(effect: MatcherEffect): string {
  if (effect === "concordancia") return "Concordou";
  if (effect === "discordancia") return "Discordou";
  return "Fora do denominador";
}
