import type {
  FeedOrdenacao,
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
  TemasDisponiveisResponse,
} from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function feed(
  limit = 20,
  offset = 0,
  ordenacao: FeedOrdenacao = "mais-votadas",
  tema?: number,
  q?: string,
): Promise<ProposicoesFeedResponse> {
  const temaParam = tema !== undefined ? `&tema=${tema}` : "";
  const qParam = q !== undefined ? `&q=${encodeURIComponent(q)}` : "";
  return apiGet<ProposicoesFeedResponse>(
    `/proposicoes/feed?limit=${limit}&offset=${offset}&ordenacao=${ordenacao}${temaParam}${qParam}`,
  );
}

export function temasDisponiveis(): Promise<TemasDisponiveisResponse> {
  return apiGet<TemasDisponiveisResponse>("/proposicoes/feed/temas");
}

export function detalhe(
  externalIdProposicao: number,
): Promise<ProposicaoDetalhe> {
  return apiGet<ProposicaoDetalhe>(`/proposicoes/${externalIdProposicao}`);
}
