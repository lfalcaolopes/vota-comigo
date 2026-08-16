import { POSICOES_COMPUTAVEIS } from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  MatcherExecucaoRequest,
  PosicaoMatcher,
  PosicaoUsuarioMatcher,
  SiglaUf,
} from "@vota-comigo/shared-types";

import { toResultadoFiltros, type ResultadoFiltros } from "./resultado-filtros";

// O recorte entra como bloco para que um filtro novo chegue ao corpo da
// requisição sem precisar ser repetido aqui e em cada chamador.
export type ExecucaoPayloadInput = ResultadoFiltros & {
  siglaUf: SiglaUf;
  escopo: EscopoMatcher;
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

  const { externalIdProposicoesFiltroConcordancia, partidos, ...recorte } =
    toResultadoFiltros(input);

  return {
    siglaUf: input.siglaUf,
    escopo: input.escopo,
    posicoes,
    ...recorte,
    partidos: [...partidos],
    externalIdProposicoesFiltroConcordancia: [
      ...externalIdProposicoesFiltroConcordancia,
    ],
  };
}
