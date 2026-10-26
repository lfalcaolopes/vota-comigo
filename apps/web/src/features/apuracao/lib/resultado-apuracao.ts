import resultadoFinalData from "../data/resultado-final-2026.json";

export type ApuracaoCandidato = {
  numero: string;
  nome: string;
  votos: number;
};

export type ResultadoUf = {
  siglaUf: string;
  urnasApuradas: number;
  votosA: number;
  votosB: number;
  shareA: number;
};

export type ResultadoFinal = {
  tseUpdatedAt: string;
  urnasApuradas: number;
  candidatoA: ApuracaoCandidato;
  candidatoB: ApuracaoCandidato;
  shareA: number;
  ufs: ResultadoUf[];
};

type ResultadoFinalData = Omit<ResultadoFinal, "shareA" | "ufs"> & {
  ufs: Omit<ResultadoUf, "shareA">[];
};

function toShareA(votosA: number, votosB: number): number {
  const total = votosA + votosB;
  return total > 0 ? votosA / total : 0.5;
}

export function toResultadoFinal(data: ResultadoFinalData): ResultadoFinal {
  return {
    ...data,
    shareA: toShareA(data.candidatoA.votos, data.candidatoB.votos),
    ufs: data.ufs
      .map((uf) => ({ ...uf, shareA: toShareA(uf.votosA, uf.votosB) }))
      .sort((a, b) => b.votosA + b.votosB - (a.votosA + a.votosB)),
  };
}

export const resultadoFinal = toResultadoFinal(resultadoFinalData);
