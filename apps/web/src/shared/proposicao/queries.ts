import type {
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
} from "@vota-comigo/shared-types";

import { EmptyQueryError, apiGet } from "@/shared/lib/api-client";

export function feed(
  limit = 20,
  offset = 0,
): Promise<ProposicoesFeedResponse> {
  return apiGet<ProposicoesFeedResponse>(
    `/proposicoes/feed?limit=${limit}&offset=${offset}`,
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

export function detalhe(
  externalIdProposicao: number,
): Promise<ProposicaoDetalhe> {
  return apiGet<ProposicaoDetalhe>(`/proposicoes/${externalIdProposicao}`);
}
