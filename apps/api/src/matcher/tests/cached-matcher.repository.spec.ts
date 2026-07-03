import type { MatcherRepository } from '../matcher.repository';
import { createCachedMatcherRepository } from '../cached-matcher.repository';

type InnerSpy = {
  [K in keyof MatcherRepository]: jest.Mock;
};

function createInnerSpy(): InnerSpy {
  return {
    loadExternalIdProposicoesComputaveis: jest.fn(
      async () => new Set<number>(),
    ),
    loadVotacoesReferenciaWithVotos: jest.fn(async () => []),
    loadDeputadosByEscopoWithHistorico: jest.fn(async () => []),
    loadDeputadoByExternalIdWithHistorico: jest.fn(async () => null),
  };
}

describe('createCachedMatcherRepository', () => {
  describe('when loading deputados by escopo repeatedly', () => {
    it('hits the database once for the same escopo within the ttl', async () => {
      // Arrange
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => 0,
      });

      // Act
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'SP');
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'SP');

      // Assert
      expect(inner.loadDeputadosByEscopoWithHistorico).toHaveBeenCalledTimes(1);
    });

    it('reuses one nacional entry regardless of the ignored siglaUf', async () => {
      // Arrange
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => 0,
      });

      // Act
      await cached.loadDeputadosByEscopoWithHistorico('nacional', 'SP');
      await cached.loadDeputadosByEscopoWithHistorico('nacional', 'RJ');

      // Assert
      expect(inner.loadDeputadosByEscopoWithHistorico).toHaveBeenCalledTimes(1);
    });

    it('hits the database once per distinct estadual siglaUf', async () => {
      // Arrange
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => 0,
      });

      // Act
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'SP');
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'RJ');

      // Assert
      expect(inner.loadDeputadosByEscopoWithHistorico).toHaveBeenCalledTimes(2);
    });

    it('reloads from the database once the ttl has elapsed', async () => {
      // Arrange
      let now = 0;
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => now,
      });

      // Act
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'SP');
      now = 1_000;
      await cached.loadDeputadosByEscopoWithHistorico('estadual', 'SP');

      // Assert
      expect(inner.loadDeputadosByEscopoWithHistorico).toHaveBeenCalledTimes(2);
    });
  });

  describe('when loading votacoes referencia', () => {
    it('treats id lists as order-independent for caching', async () => {
      // Arrange
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => 0,
      });

      // Act
      await cached.loadVotacoesReferenciaWithVotos([1, 2, 3]);
      await cached.loadVotacoesReferenciaWithVotos([3, 2, 1]);

      // Assert
      expect(inner.loadVotacoesReferenciaWithVotos).toHaveBeenCalledTimes(1);
    });
  });

  describe('when loading a deputado detail that does not exist', () => {
    it('caches the null result without hitting the database again', async () => {
      // Arrange
      const inner = createInnerSpy();
      const cached = createCachedMatcherRepository(inner, {
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => 0,
      });

      // Act
      const first = await cached.loadDeputadoByExternalIdWithHistorico(
        'estadual',
        'SP',
        99,
      );
      const second = await cached.loadDeputadoByExternalIdWithHistorico(
        'estadual',
        'SP',
        99,
      );

      // Assert
      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(inner.loadDeputadoByExternalIdWithHistorico).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
