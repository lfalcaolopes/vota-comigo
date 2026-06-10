import type {
  MaisVotadasResponse,
  ProposicoesSearchResponse,
} from "@vota-comigo/shared-types";

import { EmptyQueryError, apiGet } from "@/shared/lib/api-client";

export function maisVotadas(
  limit = 20,
  offset = 0,
): Promise<MaisVotadasResponse> {
  return apiGet<MaisVotadasResponse>(
    `/proposicoes/mais-votadas?limit=${limit}&offset=${offset}`,
  );
}

export function search(
  q: string,
  limit = 20,
  offset = 0,
): Promise<ProposicoesSearchResponse> {
  const term = q.trim();
  if (term.length === 0) {
    return Promise.reject(new EmptyQueryError());
  }

  return apiGet<ProposicoesSearchResponse>(
    `/proposicoes/search?q=${encodeURIComponent(term)}&limit=${limit}&offset=${offset}`,
  );
}
