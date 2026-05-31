export type CamaraJsonResponse =
  | { ok: true; body: unknown }
  | { ok: false; status: number; statusText: string; retryAfter?: string };

export type CamaraJsonTransportOptions = {
  signal?: AbortSignal;
};

export type CamaraJsonTransport = (
  url: string,
  options?: CamaraJsonTransportOptions,
) => Promise<CamaraJsonResponse>;

export const fetchCamaraJson: CamaraJsonTransport = async (url, options) => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: options?.signal,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      retryAfter: response.headers.get('Retry-After') ?? undefined,
    };
  }

  return { ok: true, body: await response.json() };
};
