import {
  createOpenrouterEmbeddingClient,
  type EmbeddingOutcome,
} from '../openrouter-embedding-client';

const DIM = 3;

function vector(seed: number): number[] {
  return Array.from({ length: DIM }, (_value, index) => seed + index);
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function errorResponse(status: number, body: unknown = {}) {
  return { ok: false, status, json: () => Promise.resolve(body) };
}

function buildClient(
  responses: readonly unknown[],
  overrides: Record<string, unknown> = {},
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const queue = [...responses];
  const fetchImpl = (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next as never);
  };

  const client = createOpenrouterEmbeddingClient({
    apiKey: 'chave-de-teste',
    model: 'openai/text-embedding-3-small',
    dimensions: DIM,
    fetch: fetchImpl,
    sleep: () => Promise.resolve(),
    ...overrides,
  });

  return { client, calls };
}

describe('createOpenrouterEmbeddingClient', () => {
  describe('when the provider answers with one vector per input', () => {
    it('returns the vectors in the order of the inputs', async () => {
      // Arrange
      const { client } = buildClient([
        okResponse({
          data: [
            { index: 1, embedding: vector(10) },
            { index: 0, embedding: vector(0) },
          ],
        }),
      ]);

      // Act
      const outcome = await client.embed(['piso da enfermagem', 'saúde']);

      // Assert
      expect(outcome).toEqual<EmbeddingOutcome>({
        ok: true,
        embeddings: [vector(0), vector(10)],
      });
    });

    it('sends the model, the inputs and the credential', async () => {
      // Arrange
      const { client, calls } = buildClient([
        okResponse({ data: [{ index: 0, embedding: vector(0) }] }),
      ]);

      // Act
      await client.embed(['saúde']);

      // Assert
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://openrouter.ai/api/v1/embeddings');
      expect(JSON.parse(calls[0].init.body as string)).toEqual({
        model: 'openai/text-embedding-3-small',
        input: ['saúde'],
      });
      expect(
        (calls[0].init.headers as Record<string, string>)['Authorization'],
      ).toBe('Bearer chave-de-teste');
    });
  });

  describe('when the answer does not match what was asked', () => {
    it('fails when the provider returns fewer vectors than inputs', async () => {
      // Arrange
      const { client } = buildClient([
        okResponse({ data: [{ index: 0, embedding: vector(0) }] }),
      ]);

      // Act
      const outcome = await client.embed(['saúde', 'educação']);

      // Assert
      expect(outcome.ok).toBe(false);
    });

    it('fails when a vector has an unexpected dimension', async () => {
      // Arrange
      const { client } = buildClient([
        okResponse({ data: [{ index: 0, embedding: [1, 2] }] }),
      ]);

      // Act
      const outcome = await client.embed(['saúde']);

      // Assert
      expect(outcome.ok).toBe(false);
    });

    it('fails when the body has no data array', async () => {
      // Arrange
      const { client } = buildClient([okResponse({ erro: 'inesperado' })]);

      // Act
      const outcome = await client.embed(['saúde']);

      // Assert
      expect(outcome.ok).toBe(false);
    });
  });

  describe('when the failure is transient', () => {
    it.each([
      ['a 500 from the provider', errorResponse(500)],
      ['a rate limit', errorResponse(429)],
      ['a network error', new Error('socket hang up')],
    ])('retries after %s', async (_label, failure) => {
      // Arrange
      const { client, calls } = buildClient([
        failure,
        okResponse({ data: [{ index: 0, embedding: vector(0) }] }),
      ]);

      // Act
      const outcome = await client.embed(['saúde']);

      // Assert
      expect(outcome).toEqual<EmbeddingOutcome>({
        ok: true,
        embeddings: [vector(0)],
      });
      expect(calls).toHaveLength(2);
    });

    it('gives up after the attempt budget and reports the last reason', async () => {
      // Arrange
      const { client, calls } = buildClient(
        [errorResponse(503), errorResponse(503), errorResponse(503)],
        { maxAttempts: 3 },
      );

      // Act
      const outcome = await client.embed(['saúde']);

      // Assert
      expect(outcome.ok).toBe(false);
      expect(calls).toHaveLength(3);
    });
  });

  describe('when the failure is permanent', () => {
    it('does not retry a rejected request', async () => {
      // Arrange
      const { client, calls } = buildClient([
        errorResponse(400, { error: { message: 'modelo inexistente' } }),
      ]);

      // Act
      const outcome = await client.embed(['saúde']);

      // Assert
      expect(outcome.ok).toBe(false);
      expect(calls).toHaveLength(1);
    });
  });

  describe('when there is nothing to embed', () => {
    it('answers without calling the provider', async () => {
      // Arrange
      const { client, calls } = buildClient([]);

      // Act
      const outcome = await client.embed([]);

      // Assert
      expect(outcome).toEqual<EmbeddingOutcome>({ ok: true, embeddings: [] });
      expect(calls).toHaveLength(0);
    });
  });
});
