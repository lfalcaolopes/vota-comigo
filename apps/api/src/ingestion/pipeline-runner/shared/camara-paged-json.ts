import {
  isTransientHttpStatus,
  retryDelayMs,
} from '../../camara-csv-downloader/resilience/retry-policy';
import type {
  CamaraJsonResponse,
  CamaraJsonTransport,
} from './camara-api-transport';
import { isRecord } from './json-value';

export const DEFAULT_CAMARA_BASE_URL =
  'https://dadosabertos.camara.leg.br/api/v2';
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_RETRY_BACKOFF_MS: readonly number[] = [1000, 2000];

export type CamaraPagedJsonDeps = {
  transport: CamaraJsonTransport;
  sleep: (ms: number) => Promise<void>;
  maxAttempts: number;
  retryBackoffMs: readonly number[];
  onRetry?: (attempt: number, delayMs: number, reason: string) => void;
};

export type CamaraPagedJsonResult =
  | { ok: true; dados: readonly unknown[] }
  | { ok: false; reason: string };

export async function fetchPagedJson(
  initialUrl: string,
  deps: CamaraPagedJsonDeps,
): Promise<CamaraPagedJsonResult> {
  const dados: unknown[] = [];
  let url: string | undefined = initialUrl;

  while (url !== undefined) {
    const page = await fetchPage(url, deps);

    if (!page.ok) {
      return { ok: false, reason: page.reason };
    }

    dados.push(...page.dados);
    url = page.nextUrl;
  }

  return { ok: true, dados };
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PageResult =
  | { ok: true; dados: readonly unknown[]; nextUrl?: string }
  | { ok: false; reason: string };

async function fetchPage(
  url: string,
  deps: CamaraPagedJsonDeps,
): Promise<PageResult> {
  for (let attempt = 1; attempt <= deps.maxAttempts; attempt += 1) {
    const response = await deps.transport(url);

    if (response.ok) {
      return readPage(response.body);
    }

    const transient = isTransientHttpStatus(response.status);
    const reason = describeFailure(response);

    if (!transient || attempt === deps.maxAttempts) {
      return { ok: false, reason };
    }

    const delayMs = retryDelayMs(response, attempt, deps.retryBackoffMs);
    deps.onRetry?.(attempt, delayMs, reason);
    await deps.sleep(delayMs);
  }

  return { ok: false, reason: 'tentativas esgotadas' };
}

function describeFailure(response: CamaraJsonResponse): string {
  if (response.ok) {
    return '';
  }

  const parts = [`${response.status} ${response.statusText}`];

  if (response.retryAfter !== undefined) {
    parts.push(`Retry-After: ${response.retryAfter}`);
  }

  const remaining = response.rateLimit?.remaining;
  if (remaining !== undefined) {
    parts.push(`X-RateLimit-Remaining: ${remaining}`);
  }

  return parts.length === 1
    ? parts[0]
    : `${parts[0]} (${parts.slice(1).join(', ')})`;
}

function readPage(body: unknown): PageResult {
  const dados = isRecord(body) && Array.isArray(body.dados) ? body.dados : [];
  const links = isRecord(body) && Array.isArray(body.links) ? body.links : [];
  const next = links.find(
    (link): link is { rel: string; href: string } =>
      isRecord(link) && link.rel === 'next' && typeof link.href === 'string',
  );

  return { ok: true, dados, nextUrl: next?.href };
}
