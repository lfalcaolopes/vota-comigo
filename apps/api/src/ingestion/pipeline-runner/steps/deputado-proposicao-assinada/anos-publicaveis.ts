export type AnosPublicaveisInput = {
  anosEmDisco: readonly number[];
  yearsEmEscopo: readonly number[];
};

export type AnosPublicaveis = {
  piso: number | null;
  teto: number | null;
  isPublicavel(year: number): boolean;
};

// Um balde-ano só é publicável quando a vizinhança inteira {Y-1, Y, Y+1} que
// cai dentro do que existe em disco também está no escopo desta execução:
// caso contrário, uma linha que transborda de um ano vizinho fora do escopo
// (renumeração, apresentação em outro ano) corromperia o balde.
export function deriveAnosPublicaveis(
  input: AnosPublicaveisInput,
): AnosPublicaveis {
  if (input.anosEmDisco.length === 0) {
    return { piso: null, teto: null, isPublicavel: () => false };
  }

  const piso = Math.min(...input.anosEmDisco);
  const teto = Math.max(...input.anosEmDisco);
  const escopo = new Set(input.yearsEmEscopo);

  return {
    piso,
    teto,
    isPublicavel(year: number): boolean {
      for (const vizinho of [year - 1, year, year + 1]) {
        if (vizinho < piso || vizinho > teto) {
          continue;
        }

        if (!escopo.has(vizinho)) {
          return false;
        }
      }

      return true;
    },
  };
}
