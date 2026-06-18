export type DeputadosFeedSearchParams = {
  q?: string;
  emAtividade?: string;
  uf?: string;
  partido?: string;
};

export type DeputadosFeedUrlState = {
  query: string | null;
  emAtividade: boolean;
  uf: string | null;
  partido: string | null;
};

export function parseDeputadosFeedUrlState(
  params: DeputadosFeedSearchParams,
): DeputadosFeedUrlState {
  return {
    query: parseQueryParam(params.q),
    emAtividade: params.emAtividade === "true",
    uf: parseUfParam(params.uf),
    partido: parsePartidoParam(params.partido),
  };
}

export function buildDeputadosFeedSearchParams({
  query,
  emAtividade,
  uf,
  partido,
}: DeputadosFeedUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const term = parseQueryParam(query ?? undefined);

  if (term !== null) params.set("q", term);
  if (emAtividade) params.set("emAtividade", "true");
  if (uf !== null) params.set("uf", uf);
  if (partido !== null) params.set("partido", partido);

  return params;
}

export function buildDeputadosFeedHref(
  pathname: string,
  state: DeputadosFeedUrlState,
): string {
  const params = buildDeputadosFeedSearchParams(state);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function parseQueryParam(raw: string | undefined): string | null {
  const term = raw?.trim();
  if (!term || !/[\p{L}\p{N}]/u.test(term)) return null;
  return term;
}

function parseUfParam(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const uf = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(uf) ? uf : null;
}

function parsePartidoParam(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const partido = raw.trim();
  return /^[\p{L}\p{N}.*]{1,24}$/u.test(partido) ? partido : null;
}
