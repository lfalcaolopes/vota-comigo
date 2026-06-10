import {
  MAX_POSICOES,
  MIN_POSICOES_COMPUTAVEIS,
  POSICOES_COMPUTAVEIS,
} from "@vota-comigo/shared-types";
import type { PosicaoUsuarioMatcher } from "@vota-comigo/shared-types";

export type ExecucaoValidationInput = {
  totalSelecionadas: number;
  posicoes: readonly PosicaoUsuarioMatcher[];
};

export type ExecucaoValidation = {
  totalSelecionadas: number;
  totalComputaveis: number;
  faltamComputaveis: number;
  excedeMax: boolean;
  valid: boolean;
};

function isComputavel(posicao: PosicaoUsuarioMatcher): boolean {
  return (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao);
}

export function validateExecucao(
  input: ExecucaoValidationInput,
): ExecucaoValidation {
  const totalComputaveis = input.posicoes.filter(isComputavel).length;
  const faltamComputaveis = Math.max(
    MIN_POSICOES_COMPUTAVEIS - totalComputaveis,
    0,
  );
  const excedeMax = input.totalSelecionadas > MAX_POSICOES;

  return {
    totalSelecionadas: input.totalSelecionadas,
    totalComputaveis,
    faltamComputaveis,
    excedeMax,
    valid: faltamComputaveis === 0 && !excedeMax,
  };
}
