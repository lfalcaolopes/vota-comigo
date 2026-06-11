import type {
  MatcherDeputadoDetalhe,
  MatcherExecucaoRequest,
  MatcherResultado,
} from "@vota-comigo/shared-types";

import { apiPost } from "@/shared/lib/api-client";

type Pagination = {
  limit?: number;
  offset?: number;
};

export function runMatcher(
  request: MatcherExecucaoRequest,
  { limit = 20, offset = 0 }: Pagination = {},
): Promise<MatcherResultado> {
  return apiPost<MatcherResultado>(
    `/matcher?limit=${limit}&offset=${offset}`,
    request,
  );
}

export function getDeputadoDetalhe(
  externalIdDeputado: number,
  request: MatcherExecucaoRequest,
): Promise<MatcherDeputadoDetalhe> {
  return apiPost<MatcherDeputadoDetalhe>(
    `/matcher/deputados/${externalIdDeputado}`,
    request,
  );
}
