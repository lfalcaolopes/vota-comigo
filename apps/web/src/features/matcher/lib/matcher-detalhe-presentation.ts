import type {
  DeputadoVotacaoClassification,
  MatcherEffect,
  MatcherVotoDetalhe,
} from "@vota-comigo/shared-types";

export const FORA_DO_DENOMINADOR_EXPLICACAO =
  "Estas propostas não entraram na conta porque o deputado estava fora de exercício ou teve impedimento regimental na votação.";

export const AMOSTRA_PEQUENA_CAVEAT =
  "Poucos votos em comum: o deputado tem voto registrado em menos da metade das propostas que você escolheu, então este percentual é menos confiável.";

export function formatAmostraComparavel(amostraComparavel: number): string {
  if (amostraComparavel === 0) return "nenhuma resposta entrou na conta";
  if (amostraComparavel === 1) return "1 resposta entrou na conta";
  return `${amostraComparavel} respostas entraram na conta`;
}

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
  artigo_17: "Impedimento regimental",
  voto_nao_informado: "Voto não informado",
  lacuna_de_dados: "Sem dados",
};

export function toSituacaoLabel(
  situacao: DeputadoVotacaoClassification,
): string {
  return SITUACAO_LABELS[situacao];
}

export const VOTO_FILTROS = [
  "todos",
  "alinhados",
  "divergentes",
  "fora",
] as const;

export type VotoFiltro = (typeof VOTO_FILTROS)[number];

const FILTRO_EFFECT: Record<Exclude<VotoFiltro, "todos">, MatcherEffect> = {
  alinhados: "concordancia",
  divergentes: "discordancia",
  fora: "fora_do_denominador",
};

const FILTRO_LABELS: Record<VotoFiltro, string> = {
  todos: "Todos",
  alinhados: "Votou como você",
  divergentes: "Votou diferente",
  fora: "Fora da conta",
};

export function toFiltroLabel(filtro: VotoFiltro): string {
  return FILTRO_LABELS[filtro];
}

export function filterVotos(
  votos: MatcherVotoDetalhe[],
  filtro: VotoFiltro,
): MatcherVotoDetalhe[] {
  if (filtro === "todos") return votos;
  return votos.filter((v) => v.matcherEffect === FILTRO_EFFECT[filtro]);
}

export function countVotosByFiltro(
  votos: MatcherVotoDetalhe[],
): Record<VotoFiltro, number> {
  const groups = groupVotosByMatcherEffect(votos);

  return {
    todos: votos.length,
    alinhados: groups.concordancia.length,
    divergentes: groups.discordancia.length,
    fora: groups.fora_do_denominador.length,
  };
}

export function sortVotosByVotacaoDataDesc(
  votos: MatcherVotoDetalhe[],
): MatcherVotoDetalhe[] {
  return [...votos].sort((a, b) => {
    const da = a.votacaoReferencia.data;
    const db = b.votacaoReferencia.data;

    if (da === db) return 0;
    if (da === null) return 1;
    if (db === null) return -1;

    return da < db ? 1 : -1;
  });
}

export type MatcherVerdictTone = "success" | "danger" | "neutral";

export type MatcherVerdict = {
  label: string;
  tone: MatcherVerdictTone;
};

export function toMatcherEffectVerdict(effect: MatcherEffect): MatcherVerdict {
  if (effect === "concordancia")
    return { label: "Votou como você", tone: "success" };
  if (effect === "discordancia")
    return { label: "Votou diferente", tone: "danger" };
  return { label: "Fora da conta", tone: "neutral" };
}
