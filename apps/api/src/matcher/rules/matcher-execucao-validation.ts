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

export type ExecucaoValidationInput = {
  siglaUf: SiglaUf;
  cidade?: string;
  posicoes: readonly PosicaoMatcher[];
  externalIdProposicoesFiltroConcordancia: readonly number[];
  externalIdProposicoesComputaveis: ReadonlySet<number>;
};

export type ExecucaoValidationResult =
  | { ok: true; resumo: MatcherExecucaoResumo }
  | { ok: false; error: string };

function isComputavel(posicao: PosicaoUsuarioMatcher): boolean {
  return (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao);
}

export function validateExecucao(
  input: ExecucaoValidationInput,
): ExecucaoValidationResult {
  const posicoesComputaveisSelecionadas = input.posicoes.filter((posicao) =>
    isComputavel(posicao.posicao),
  );
  const externalIdPosicoesComputaveisSelecionadas = new Set(
    posicoesComputaveisSelecionadas.map(
      (posicao) => posicao.externalIdProposicao,
    ),
  );
  const filtroConcordanciaInvalido =
    input.externalIdProposicoesFiltroConcordancia.filter(
      (externalIdProposicao) =>
        !externalIdPosicoesComputaveisSelecionadas.has(externalIdProposicao),
    );
  if (filtroConcordanciaInvalido.length > 0) {
    return {
      ok: false,
      error: `proposicoes do filtro de concordancia ausentes das posicoes computaveis: ${filtroConcordanciaInvalido.join(', ')}`,
    };
  }

  const posicoesNaoComputaveis = posicoesComputaveisSelecionadas.filter(
    (posicao) =>
      !input.externalIdProposicoesComputaveis.has(posicao.externalIdProposicao),
  );
  if (posicoesNaoComputaveis.length > 0) {
    const ids = posicoesNaoComputaveis
      .map((posicao) => posicao.externalIdProposicao)
      .join(', ');
    return {
      ok: false,
      error: `proposicoes nao computaveis pelo matcher: ${ids}`,
    };
  }

  if (posicoesComputaveisSelecionadas.length < MIN_POSICOES_COMPUTAVEIS) {
    return {
      ok: false,
      error: `minimo de ${MIN_POSICOES_COMPUTAVEIS} posicoes computaveis (aprovar ou rejeitar)`,
    };
  }

  return {
    ok: true,
    resumo: {
      siglaUf: input.siglaUf,
      cidade: input.cidade ?? null,
      totalProposicoesSelecionadas: input.posicoes.length,
      totalPosicoesComputaveis: posicoesComputaveisSelecionadas.length,
    },
  };
}
