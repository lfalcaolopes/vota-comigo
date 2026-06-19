import {
  createOpenrouterResumoIaClient,
  type CreateOpenrouterResumoIaClientOptions,
} from '../generation/openrouter-resumo-ia-client';
import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
type FetchFn = NonNullable<CreateOpenrouterResumoIaClientOptions['fetch']>;

function source(): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Ementa.',
    ementaDetalhada: null,
    keywords: null,
  };
}

function makeFetch(response: {
  ok: boolean;
  status?: number;
  body?: unknown;
}): jest.MockedFunction<FetchFn> {
  return jest.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: jest.fn(async () => response.body ?? {}),
  }));
}

function openrouterBody(content: unknown): unknown {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
  };
}

describe('createOpenrouterResumoIaClient', () => {
  describe('when the API returns a valid generated response', () => {
    it('returns ok:true with the parsed response', async () => {
      // Arrange
      const modelResponse = {
        status: 'generated',
        resumoCard: 'Card.',
        resumoDetalhe: 'Detalhe.',
      };
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody(modelResponse),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.response.status).toBe('generated');
        expect(outcome.response.resumoCard).toBe('Card.');
        expect(outcome.response.resumoDetalhe).toBe('Detalhe.');
      }
    });

    it('calls the correct OpenRouter URL', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody({
          status: 'generated',
          resumoCard: 'R.',
          resumoDetalhe: 'D.',
        }),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      await client.generate(source());

      // Assert
      expect(fetch).toHaveBeenCalledWith(OPENROUTER_URL, expect.any(Object));
    });

    it('sends Authorization header with the API key', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody({
          status: 'generated',
          resumoCard: 'R.',
          resumoDetalhe: 'D.',
        }),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'my-api-key',
        model: 'model-x',
        fetch,
      });

      // Act
      await client.generate(source());

      // Assert
      const init = fetch.mock.calls[0]?.[1];
      if (init === undefined) throw new Error('fetch não chamado');
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-api-key');
    });

    it('sends the model and response_format in the request body', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody({
          status: 'generated',
          resumoCard: 'R.',
          resumoDetalhe: 'D.',
        }),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'gpt-4o',
        fetch,
      });

      // Act
      await client.generate(source());

      // Assert
      const init = fetch.mock.calls[0]?.[1];
      if (init === undefined) throw new Error('fetch não chamado');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['model']).toBe('gpt-4o');
      expect(body['response_format']).toEqual({ type: 'json_object' });
    });
  });

  describe('when the API returns an insufficient_source response', () => {
    it('returns ok:true with status insufficient_source', async () => {
      // Arrange
      const modelResponse = {
        status: 'insufficient_source',
        resumoCard: null,
        resumoDetalhe: null,
      };
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody(modelResponse),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.response.status).toBe('insufficient_source');
        expect(outcome.response.resumoCard).toBeNull();
        expect(outcome.response.resumoDetalhe).toBeNull();
      }
    });
  });

  describe('when the HTTP request fails', () => {
    it('returns ok:false on non-2xx status', async () => {
      // Arrange
      const fetch = makeFetch({ ok: false, status: 429 });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(false);
    });

    it('returns ok:false on network error (fetch throws)', async () => {
      // Arrange
      const fetch = jest.fn().mockRejectedValue(new Error('network error'));
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(false);
    });
  });

  describe('when the model response content is invalid', () => {
    it('returns ok:false when content is not valid JSON', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: { choices: [{ message: { content: 'texto livre não é JSON' } }] },
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(false);
    });

    it('returns ok:false when parsed content fails schema validation', async () => {
      // Arrange
      const invalidContent = {
        status: 'error',
        resumoCard: 'x',
        resumoDetalhe: 'x',
      };
      const fetch = makeFetch({
        ok: true,
        body: openrouterBody(invalidContent),
      });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(false);
    });

    it('returns ok:false when choices array is missing from response', async () => {
      // Arrange
      const fetch = makeFetch({ ok: true, body: { data: 'unexpected shape' } });
      const client = createOpenrouterResumoIaClient({
        apiKey: 'key',
        model: 'model-x',
        fetch,
      });

      // Act
      const outcome = await client.generate(source());

      // Assert
      expect(outcome.ok).toBe(false);
    });
  });
});
