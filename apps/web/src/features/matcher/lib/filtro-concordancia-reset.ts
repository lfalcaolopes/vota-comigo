import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";

type FiltroConcordanciaInput = {
  selected: readonly { externalIdProposicao: number }[];
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
};

export function shouldClearFiltroConcordancia(
  previous: FiltroConcordanciaInput,
  next: FiltroConcordanciaInput,
): boolean {
  const previousIds = previous.selected.map(
    ({ externalIdProposicao }) => externalIdProposicao,
  );
  const nextIds = next.selected.map(
    ({ externalIdProposicao }) => externalIdProposicao,
  );

  const hasSelectionChanged =
    previousIds.length !== nextIds.length ||
    previousIds.some(
      (externalIdProposicao) => !nextIds.includes(externalIdProposicao),
    );
  const hasPosicaoChanged =
    previous.posicoes.size !== next.posicoes.size ||
    [...previous.posicoes].some(
      ([externalIdProposicao, posicao]) =>
        next.posicoes.get(externalIdProposicao) !== posicao,
    );

  return hasSelectionChanged || hasPosicaoChanged;
}
