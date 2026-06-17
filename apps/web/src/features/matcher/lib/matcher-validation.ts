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
  totalRespondidas: number;
  totalComputaveis: number;
  faltamRespostas: number;
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
  const totalRespondidas = input.posicoes.length;
  const totalComputaveis = input.posicoes.filter(isComputavel).length;
  const faltamRespostas = Math.max(
    input.totalSelecionadas - totalRespondidas,
    0,
  );
  const faltamComputaveis = Math.max(
    MIN_POSICOES_COMPUTAVEIS - totalComputaveis,
    0,
  );
  const excedeMax = input.totalSelecionadas > MAX_POSICOES;

  return {
    totalSelecionadas: input.totalSelecionadas,
    totalRespondidas,
    totalComputaveis,
    faltamRespostas,
    faltamComputaveis,
    excedeMax,
    valid: faltamRespostas === 0 && faltamComputaveis === 0 && !excedeMax,
  };
}
