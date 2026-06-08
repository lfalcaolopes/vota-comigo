import {
  MIN_POSICOES_COMPUTAVEIS,
  POSICOES_COMPUTAVEIS,
} from '@vota-comigo/shared-types';
import type {
  MatcherExecucaoResumo,
  PosicaoMatcher,
  PosicaoUsuarioMatcher,
  SiglaUf,
} from '@vota-comigo/shared-types';

export type ValidacaoExecucaoInput = {
  siglaUf: SiglaUf;
  cidade?: string;
  posicoes: readonly PosicaoMatcher[];
  computaveis: ReadonlySet<number>;
};

export type ValidacaoExecucaoResult =
  | { ok: true; resumo: MatcherExecucaoResumo }
  | { ok: false; error: string };

function isComputavel(posicao: PosicaoUsuarioMatcher): boolean {
  return (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao);
}

export function validateExecucao(
  input: ValidacaoExecucaoInput,
): ValidacaoExecucaoResult {
  const computaveisSelecionadas = input.posicoes.filter((posicao) =>
    isComputavel(posicao.posicao),
  );

  const naoComputaveis = computaveisSelecionadas.filter(
    (posicao) => !input.computaveis.has(posicao.externalIdProposicao),
  );
  if (naoComputaveis.length > 0) {
    const ids = naoComputaveis
      .map((posicao) => posicao.externalIdProposicao)
      .join(', ');
    return {
      ok: false,
      error: `proposicoes nao computaveis pelo matcher: ${ids}`,
    };
  }

  if (computaveisSelecionadas.length < MIN_POSICOES_COMPUTAVEIS) {
    return {
      ok: false,
      error: `minimo de ${MIN_POSICOES_COMPUTAVEIS} posicoes computaveis (deveria_ser_aprovada ou nao_deveria_ser_aprovada)`,
    };
  }

  return {
    ok: true,
    resumo: {
      siglaUf: input.siglaUf,
      cidade: input.cidade ?? null,
      totalProposicoesSelecionadas: input.posicoes.length,
      totalPosicoesComputaveis: computaveisSelecionadas.length,
    },
  };
}
