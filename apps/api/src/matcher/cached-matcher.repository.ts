import type { EscopoMatcher, SiglaUf } from '@vota-comigo/shared-types';

import {
  createTtlCache,
  type Clock,
  type TtlCache,
} from '@/shared/cache/ttl-cache';

import type { MatcherRepository } from './matcher.repository';
import type {
  DeputadoCompatibilidadeInput,
  VotacaoReferenciaVotos,
} from './types/compatibilidade.types';

const TTL_MS = 15 * 60 * 1_000;
const MAX_ENTRIES = 128;

export type CachedMatcherRepositoryOptions = {
  readonly ttlMs?: number;
  readonly maxEntries?: number;
  readonly clock?: Clock;
};

function idsKey(externalIdProposicoes: readonly number[]): string {
  return [...externalIdProposicoes].sort((a, b) => a - b).join(',');
}

// A nacional query ignores siglaUf, so nacional keys omit it to avoid caching
// the same result once per state.
function escopoKey(escopo: EscopoMatcher, siglaUf: SiglaUf): string {
  return escopo === 'nacional' ? 'nacional' : `estadual:${siglaUf}`;
}

async function through<V>(
  cache: TtlCache<V>,
  key: string,
  load: () => Promise<V>,
): Promise<V> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = await load();
  cache.set(key, value);
  return value;
}

export function createCachedMatcherRepository(
  inner: MatcherRepository,
  options: CachedMatcherRepositoryOptions = {},
): MatcherRepository {
  const config = {
    ttlMs: options.ttlMs ?? TTL_MS,
    maxEntries: options.maxEntries ?? MAX_ENTRIES,
    clock: options.clock,
  };

  const computaveisCache = createTtlCache<ReadonlySet<number>>(config);
  const referenciaCache =
    createTtlCache<readonly VotacaoReferenciaVotos[]>(config);
  const deputadosCache =
    createTtlCache<readonly DeputadoCompatibilidadeInput[]>(config);
  const deputadoCache = createTtlCache<DeputadoCompatibilidadeInput | null>(
    config,
  );

  return {
    loadExternalIdProposicoesComputaveis(externalIdProposicoes) {
      return through(computaveisCache, idsKey(externalIdProposicoes), () =>
        inner.loadExternalIdProposicoesComputaveis(externalIdProposicoes),
      );
    },

    loadVotacoesReferenciaWithVotos(externalIdProposicoes) {
      return through(referenciaCache, idsKey(externalIdProposicoes), () =>
        inner.loadVotacoesReferenciaWithVotos(externalIdProposicoes),
      );
    },

    loadDeputadosByEscopoWithHistorico(escopo, siglaUf) {
      return through(deputadosCache, escopoKey(escopo, siglaUf), () =>
        inner.loadDeputadosByEscopoWithHistorico(escopo, siglaUf),
      );
    },

    loadDeputadoByExternalIdWithHistorico(escopo, siglaUf, externalIdDeputado) {
      const key = `${escopoKey(escopo, siglaUf)}:${externalIdDeputado}`;
      return through(deputadoCache, key, () =>
        inner.loadDeputadoByExternalIdWithHistorico(
          escopo,
          siglaUf,
          externalIdDeputado,
        ),
      );
    },
  };
}
