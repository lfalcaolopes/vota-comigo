import type {
  FeedOrdenacao,
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  ProposicoesSearchResponse,
  TemasDisponiveisResponse,
} from "@vota-comigo/shared-types";

import { EmptyQueryError, apiGet } from "@/shared/lib/api-client";

export function feed(
  limit = 20,
  offset = 0,
  ordenacao: FeedOrdenacao = 'mais-votadas',
  tema?: number,
): Promise<ProposicoesFeedResponse> {
  const temaParam = tema !== undefined ? `&tema=${tema}` : '';
  return apiGet<ProposicoesFeedResponse>(
    `/proposicoes/feed?limit=${limit}&offset=${offset}&ordenacao=${ordenacao}${temaParam}`,
  );
}

export function temasDisponiveis(): Promise<TemasDisponiveisResponse> {
  return apiGet<TemasDisponiveisResponse>('/proposicoes/feed/temas');
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
