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

export type CreateCamaraJsonTransportOptions = {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

// Aborts/network failures map to a transient status so the retry policy retries
// them instead of crashing the whole ingestion step.
const TRANSIENT_FAILURE_STATUS = 503;

export function createCamaraJsonTransport(
  options: CreateCamaraJsonTransportOptions = {},
): CamaraJsonTransport {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async (url, requestOptions) => {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: withTimeout(requestOptions?.signal, timeoutMs),
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
    } catch (error) {
      return {
        ok: false,
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

function describeFailure(error: unknown, timeoutMs: number): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return `tempo limite de ${timeoutMs}ms excedido`;
  }

  return error instanceof Error ? error.message : 'erro de rede';
}
