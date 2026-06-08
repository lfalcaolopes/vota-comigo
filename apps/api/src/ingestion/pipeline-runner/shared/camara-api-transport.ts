export type CamaraFailureKind = 'http' | 'timeout' | 'network';

export type CamaraRateLimitHeaders = {
  limit?: string;
  remaining?: string;
  reset?: string;
};

export type CamaraJsonResponse =
  | { ok: true; body: unknown }
  | {
      ok: false;
      status: number;
      statusText: string;
      kind: CamaraFailureKind;
      retryAfter?: string;
      rateLimit?: CamaraRateLimitHeaders;
    };

export type CamaraJsonTransportOptions = {
  signal?: AbortSignal;
};

export type CamaraJsonTransport = (
  url: string,
  options?: CamaraJsonTransportOptions,
) => Promise<CamaraJsonResponse>;

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};

export type CamaraFetch = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<FetchResponse>;

export type CreateCamaraJsonTransportOptions = {
  timeoutMs?: number;
  fetch?: CamaraFetch;
};

const DEFAULT_TIMEOUT_MS = 50_000;

// Aborts/network failures map to a transient status so the retry policy retries
// them instead of crashing the whole ingestion step. The kind field keeps a
// client-side timeout distinguishable from a real server 503 in the logs.
const TRANSIENT_FAILURE_STATUS = 503;

const defaultFetch: CamaraFetch = (url, init) => fetch(url, init);

export function createCamaraJsonTransport(
  options: CreateCamaraJsonTransportOptions = {},
): CamaraJsonTransport {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetch ?? defaultFetch;

  return async (url, requestOptions) => {
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: withTimeout(requestOptions?.signal, timeoutMs),
      });

      if (!response.ok) {
        return {
          ok: false,
          kind: 'http',
          status: response.status,
          statusText: response.statusText,
          retryAfter: response.headers.get('Retry-After') ?? undefined,
          rateLimit: readRateLimitHeaders(response.headers),
        };
      }

      return { ok: true, body: await response.json() };
    } catch (error) {
      return {
        ok: false,
        kind: isTimeout(error) ? 'timeout' : 'network',
        status: TRANSIENT_FAILURE_STATUS,
        statusText: describeFailure(error, timeoutMs),
      };
    }
  };
}

export const fetchCamaraJson: CamaraJsonTransport = createCamaraJsonTransport();

function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);

  return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}

function readRateLimitHeaders(headers: {
  get(name: string): string | null;
}): CamaraRateLimitHeaders | undefined {
  const limit = headers.get('X-RateLimit-Limit') ?? undefined;
  const remaining = headers.get('X-RateLimit-Remaining') ?? undefined;
  const reset = headers.get('X-RateLimit-Reset') ?? undefined;

  if (limit === undefined && remaining === undefined && reset === undefined) {
    return undefined;
  }

  return { limit, remaining, reset };
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

function describeFailure(error: unknown, timeoutMs: number): string {
  if (isTimeout(error)) {
    return `tempo limite de ${timeoutMs}ms excedido`;
  }

  return error instanceof Error ? error.message : 'erro de rede';
}
