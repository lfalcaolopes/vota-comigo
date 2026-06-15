import { feedOrdenacao } from "@vota-comigo/shared-types";
import type { FeedOrdenacao } from "@vota-comigo/shared-types";

export type FeedSearchParams = {
  ordenacao?: string;
  q?: string;
  tema?: string;
};

export type FeedUrlState = {
  ordenacao: FeedOrdenacao;
  query: string | null;
  tema: number | null;
};

export function parseFeedUrlState(params: FeedSearchParams): FeedUrlState {
  return {
    ordenacao: feedOrdenacao
      .catch(() => "mais-votadas" as const)
      .parse(params.ordenacao),
    query: parseFeedQueryParam(params.q),
    tema: parseTemaParam(params.tema),
  };
}

export function buildFeedSearchParams({
  ordenacao,
  query,
  tema,
}: FeedUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const term = parseFeedQueryParam(query ?? undefined);

  if (term !== null) params.set("q", term);
  if (ordenacao !== "mais-votadas") params.set("ordenacao", ordenacao);
  if (tema !== null) params.set("tema", String(tema));

  return params;
}

export function buildFeedHref(pathname: string, state: FeedUrlState): string {
  const params = buildFeedSearchParams(state);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function parseFeedQueryParam(raw: string | undefined): string | null {
  const term = raw?.trim();
  if (!term || !/[\p{L}\p{N}]/u.test(term)) return null;
  return term;
}

function parseTemaParam(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
