import { createTtlCache, type Clock } from '@/shared/cache/ttl-cache';
import type { EmbeddingClient } from '@/shared/embedding/openrouter-embedding-client';

import {
  toSearchPlan,
  type ProposicoesSearchPlan,
} from '../rules/proposicoes-search';

export const QUERY_EMBEDDING = Symbol('QUERY_EMBEDDING');

export type QueryEmbedding = {
  resolve(query: string): Promise<readonly number[] | null>;
};

export type CreateQueryEmbeddingOptions = {
  client: EmbeddingClient;
  ttlMs?: number;
  maxEntries?: number;
  clock?: Clock;
};

const DEFAULT_TTL_MS = 60 * 60 * 1_000;
const DEFAULT_MAX_ENTRIES = 256;

// Sem provider a busca continua no plano de tokens, em vez de cair inteira.
export const disabledQueryEmbedding: QueryEmbedding = {
  resolve: () => Promise.resolve(null),
};

export function createQueryEmbedding(
  options: CreateQueryEmbeddingOptions,
): QueryEmbedding {
  const cache = createTtlCache<readonly number[]>({
    ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
    maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    ...(options.clock === undefined ? {} : { clock: options.clock }),
  });

  return {
    async resolve(query) {
      const input = collapseWhitespace(query);
      if (input.length === 0) {
        return null;
      }

      const key = input.toLowerCase();
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const outcome = await options.client.embed([input]);
      const embedding = outcome.ok ? (outcome.embeddings[0] ?? null) : null;
      if (embedding === null) {
        return null;
      }

      cache.set(key, embedding);
      return embedding;
    },
  };
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// A citacao tem precedencia sobre o vetorial; o plano de tokens fica como
// degradacao quando nao ha vetor da consulta.
export async function resolveSearchPlan(
  query: string,
  queryEmbedding: QueryEmbedding,
): Promise<ProposicoesSearchPlan | null> {
  const plan = toSearchPlan(query);
  if (plan === null || plan.kind !== 'tokens') {
    return plan;
  }

  const embedding = await queryEmbedding.resolve(query);
  return embedding === null ? plan : { kind: 'semantic', embedding };
}
