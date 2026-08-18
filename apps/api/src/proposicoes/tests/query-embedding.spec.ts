import type {
  EmbeddingClient,
  EmbeddingOutcome,
} from '@/shared/embedding/openrouter-embedding-client';

import { createQueryEmbedding } from '../service/query-embedding';

const VECTOR = [0.1, 0.2, 0.3];

function buildClient(outcomes: readonly EmbeddingOutcome[] = []) {
  const inputs: string[] = [];
  const queue = [...outcomes];

  const client: EmbeddingClient = {
    embed: (values) => {
      inputs.push(...values);
      return Promise.resolve(
        queue.shift() ?? { ok: true, embeddings: [VECTOR] },
      );
    },
  };

  return { client, inputs };
}

describe('createQueryEmbedding', () => {
  describe('when the provider answers', () => {
    it('resolves the query to its vector', async () => {
      // Arrange
      const { client, inputs } = buildClient();
      const queryEmbedding = createQueryEmbedding({ client });

      // Act
      const embedding = await queryEmbedding.resolve('aumento do salário');

      // Assert
      expect(embedding).toEqual(VECTOR);
      expect(inputs).toEqual(['aumento do salário']);
    });
  });

  describe('when the same query comes back', () => {
    it.each([
      ['the very same text', 'aumento do salário'],
      ['a different case', 'Aumento do Salário'],
      ['extra whitespace', '  aumento   do salário '],
    ])('serves it from cache for %s', async (_label, repeated) => {
      // Arrange
      const { client, inputs } = buildClient();
      const queryEmbedding = createQueryEmbedding({ client });
      await queryEmbedding.resolve('aumento do salário');

      // Act
      const embedding = await queryEmbedding.resolve(repeated);

      // Assert
      expect(embedding).toEqual(VECTOR);
      expect(inputs).toHaveLength(1);
    });
  });

  describe('when the cached entry has expired', () => {
    it('asks the provider again', async () => {
      // Arrange
      let now = 0;
      const { client, inputs } = buildClient();
      const queryEmbedding = createQueryEmbedding({
        client,
        ttlMs: 1_000,
        clock: () => now,
      });
      await queryEmbedding.resolve('saúde');

      // Act
      now = 2_000;
      await queryEmbedding.resolve('saúde');

      // Assert
      expect(inputs).toHaveLength(2);
    });
  });

  describe('when the provider fails', () => {
    it.each([
      ['an error outcome', { ok: false, reason: 'HTTP 503' } as const],
      ['an empty answer', { ok: true, embeddings: [] } as const],
    ])(
      'resolves to null for %s, so the search can degrade',
      async (_label, outcome) => {
        // Arrange
        const { client } = buildClient([outcome]);
        const queryEmbedding = createQueryEmbedding({ client });

        // Act
        const embedding = await queryEmbedding.resolve('saúde');

        // Assert
        expect(embedding).toBeNull();
      },
    );

    it('does not cache the failure', async () => {
      // Arrange
      const { client, inputs } = buildClient([
        { ok: false, reason: 'HTTP 503' },
      ]);
      const queryEmbedding = createQueryEmbedding({ client });
      await queryEmbedding.resolve('saúde');

      // Act
      const embedding = await queryEmbedding.resolve('saúde');

      // Assert
      expect(embedding).toEqual(VECTOR);
      expect(inputs).toHaveLength(2);
    });
  });
});
