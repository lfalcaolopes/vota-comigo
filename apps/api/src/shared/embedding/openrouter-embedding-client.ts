import { z } from 'zod';

export type EmbeddingDiagnostics = {
  httpStatus?: number;
  openrouterError?: string;
  attempts?: number;
};

export type EmbeddingOutcome =
  | { ok: true; embeddings: readonly (readonly number[])[] }
  | { ok: false; reason: string; diagnostics?: EmbeddingDiagnostics };

export interface EmbeddingClient {
  embed(inputs: readonly string[]): Promise<EmbeddingOutcome>;
}

type FetchFn = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type CreateOpenrouterEmbeddingClientOptions = {
  apiKey: string;
  model: string;
  dimensions: number;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  fetch?: FetchFn;
  sleep?: (ms: number) => Promise<void>;
};

export const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/embeddings';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 500;

const embeddingsResponseSchema = z.object({
  data: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      embedding: z.array(z.number()),
    }),
  ),
});

type AttemptResult =
  | { ok: true; embeddings: readonly (readonly number[])[] }
  | {
      ok: false;
      reason: string;
      transient: boolean;
      diagnostics?: EmbeddingDiagnostics;
    };

export function createOpenrouterEmbeddingClient(
  options: CreateOpenrouterEmbeddingClientOptions,
): EmbeddingClient {
  const fetchImpl: FetchFn = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;

  return {
    async embed(inputs): Promise<EmbeddingOutcome> {
      if (inputs.length === 0) {
        return { ok: true, embeddings: [] };
      }

      let last: AttemptResult | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        last = await runAttempt(inputs);

        if (last.ok) {
          return { ok: true, embeddings: last.embeddings };
        }
        if (!last.transient || attempt === maxAttempts) {
          return {
            ok: false,
            reason: last.reason,
            diagnostics: { ...last.diagnostics, attempts: attempt },
          };
        }

        await sleep(backoffMs * 2 ** (attempt - 1));
      }

      return { ok: false, reason: last?.reason ?? 'erro desconhecido' };
    },
  };

  async function runAttempt(inputs: readonly string[]): Promise<AttemptResult> {
    let response: Awaited<ReturnType<FetchFn>>;
    try {
      response = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: options.model, input: [...inputs] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'erro desconhecido',
        transient: true,
      };
    }

    if (!response.ok) {
      const openrouterError = extractOpenrouterError(await safeJson(response));
      return {
        ok: false,
        reason: openrouterError
          ? `HTTP ${response.status}: ${openrouterError}`
          : `HTTP ${response.status}`,
        transient: isTransientStatus(response.status),
        diagnostics: {
          httpStatus: response.status,
          ...(openrouterError ? { openrouterError } : {}),
        },
      };
    }

    const body = await safeJson(response);

    // OpenRouter devolve erro com status 200 tambem.
    const openrouterError = extractOpenrouterError(body);
    if (openrouterError !== null) {
      return {
        ok: false,
        reason: `erro OpenRouter: ${openrouterError}`,
        transient: true,
        diagnostics: { openrouterError },
      };
    }

    const validated = embeddingsResponseSchema.safeParse(body);
    if (!validated.success) {
      return {
        ok: false,
        reason: `schema inválido: ${validated.error.message}`,
        transient: false,
      };
    }

    return toEmbeddings(validated.data.data, inputs.length, options.dimensions);
  }
}

function toEmbeddings(
  data: readonly { index: number; embedding: number[] }[],
  expectedCount: number,
  dimensions: number,
): AttemptResult {
  if (data.length !== expectedCount) {
    return {
      ok: false,
      reason: `resposta com ${data.length} vetor(es) para ${expectedCount} entrada(s)`,
      transient: false,
    };
  }

  const byIndex = [...data].sort((a, b) => a.index - b.index);
  const wrongDimension = byIndex.find(
    (item) => item.embedding.length !== dimensions,
  );
  if (wrongDimension !== undefined) {
    return {
      ok: false,
      reason: `vetor com ${wrongDimension.embedding.length} dimensões, esperado ${dimensions}`,
      transient: false,
    };
  }

  return { ok: true, embeddings: byIndex.map((item) => item.embedding) };
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function safeJson(response: {
  json(): Promise<unknown>;
}): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function extractOpenrouterError(body: unknown): string | null {
  const record = asRecord(body);
  const error = record?.['error'];
  if (typeof error === 'string') return error;
  const errorRecord = asRecord(error);
  if (errorRecord === null) return null;
  const message = errorRecord['message'];
  const code = errorRecord['code'];
  const text = typeof message === 'string' ? message : 'erro sem mensagem';
  const codeText =
    typeof code === 'string' || typeof code === 'number' ? String(code) : null;
  const base = codeText !== null ? `${text} (code=${codeText})` : text;

  // OpenRouter colapsa todo erro upstream em "Provider returned error";
  // a causa real so existe em error.metadata.raw.
  const raw = asRecord(errorRecord['metadata'])?.['raw'];
  return typeof raw === 'string' ? `${base}: ${raw.slice(0, 200)}` : base;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
