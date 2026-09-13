import type { ProposicaoCard } from "@vota-comigo/shared-types";

export type TopicResult = {
  topic: string;
  card: ProposicaoCard | null;
};

export type Destaque = {
  card: ProposicaoCard;
  topic: string | null;
};

export function pickDestaques(
  byTopic: readonly TopicResult[],
  fallback: readonly ProposicaoCard[],
  limit: number,
): readonly Destaque[] {
  const seen = new Set<number>();
  const picked: Destaque[] = [];
  const candidates: readonly Destaque[] = [
    ...byTopic.flatMap(({ topic, card }) =>
      card === null ? [] : [{ card, topic }],
    ),
    ...fallback.map((card) => ({ card, topic: null })),
  ];

  for (const candidate of candidates) {
    if (picked.length === limit) break;
    if (seen.has(candidate.card.externalIdProposicao)) continue;
    seen.add(candidate.card.externalIdProposicao);
    picked.push(candidate);
  }

  return picked;
}
