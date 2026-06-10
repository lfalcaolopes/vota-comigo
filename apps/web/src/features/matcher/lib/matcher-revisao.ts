import {
  POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

export type RevisaoItem = {
  card: ProposicaoCard;
  posicao: PosicaoUsuarioMatcher | null;
  computavel: boolean;
};

export function buildRevisaoItems(
  selected: ProposicaoCard[],
  posicoes: Map<number, PosicaoUsuarioMatcher>,
): RevisaoItem[] {
  return selected.map((card) => {
    const posicao = posicoes.get(card.externalIdProposicao) ?? null;
    const computavel =
      posicao !== null &&
      (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao);
    return { card, posicao, computavel };
  });
}

export function posicaoLabel(posicao: PosicaoUsuarioMatcher | null): string {
  if (posicao === null) return "A decidir";
  if (posicao === "aprovar") return "Deveria ser aprovada";
  if (posicao === "rejeitar") return "Não deveria ser aprovada";
  return "Não sei";
}
