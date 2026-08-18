import { MIN_POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";

export type PosicoesPendencia = {
  instrucao: string;
  contagem: string;
};

export function toPosicoesPendencia(input: {
  faltamRespostas: number;
  faltamComputaveis: number;
}): PosicoesPendencia | null {
  if (input.faltamRespostas > 0) {
    return {
      instrucao: "Responda todas para ver o resultado.",
      contagem:
        input.faltamRespostas === 1
          ? "Falta 1 proposta."
          : `Faltam ${input.faltamRespostas} propostas.`,
    };
  }

  if (input.faltamComputaveis > 0) {
    const respondidas = MIN_POSICOES_COMPUTAVEIS - input.faltamComputaveis;
    return {
      instrucao: `Responda Sim ou Não em pelo menos ${MIN_POSICOES_COMPUTAVEIS} propostas.`,
      contagem: `Você tem ${respondidas}.`,
    };
  }

  return null;
}
