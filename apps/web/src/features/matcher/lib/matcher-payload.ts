import { POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  MatcherExecucaoRequest,
  PosicaoMatcher,
  PosicaoUsuarioMatcher,
  SiglaUf,
} from "@vota-comigo/shared-types";

export type ExecucaoPayloadInput = {
  siglaUf: SiglaUf;
  escopo: EscopoMatcher;
  cidade?: string;
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
};

function isComputavel(posicao: PosicaoUsuarioMatcher): boolean {
  return (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao);
}

export function buildExecucaoRequest(
  input: ExecucaoPayloadInput,
): MatcherExecucaoRequest {
  const posicoes: PosicaoMatcher[] = [...input.posicoes.entries()]
    .filter(([, posicao]) => isComputavel(posicao))
    .map(([externalIdProposicao, posicao]) => ({
      externalIdProposicao,
      posicao,
    }));

  const cidade = input.cidade?.trim();

  return {
    siglaUf: input.siglaUf,
    escopo: input.escopo,
    posicoes,
    ...(cidade ? { cidade } : {}),
  };
}
