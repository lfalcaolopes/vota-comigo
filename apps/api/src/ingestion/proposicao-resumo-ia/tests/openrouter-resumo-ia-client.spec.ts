import {
  createOpenrouterResumoIaClient,
  type CreateOpenrouterResumoIaClientOptions,
} from '../generation/openrouter-resumo-ia-client';
import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
type FetchFn = NonNullable<CreateOpenrouterResumoIaClientOptions['fetch']>;

function source(
  overrides: Partial<ProposicaoResumoIaSource> = {},
): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Ementa.',
    ementaDetalhada: null,
    keywords: null,
    urlInteiroTeor: null,
    ...overrides,
  };
}

function makeFetch(response: {
  ok: boolean;
  status?: number;
  body?: unknown;
}): jest.MockedFunction<FetchFn> {
  const fetchMock: FetchFn = async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body ?? {},
  });
  return jest.fn(fetchMock);
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

    it('sends a plain text message when there is no inteiro teor', async () => {
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
      await client.generate(source({ urlInteiroTeor: null }));

      // Assert
      const init = fetch.mock.calls[0]?.[1];
      if (init === undefined) throw new Error('fetch não chamado');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const messages = body['messages'] as Array<Record<string, unknown>>;
      expect(typeof messages[0]?.['content']).toBe('string');
      expect(body['plugins']).toBeUndefined();
    });
  });

  describe('when the source has an inteiro teor URL', () => {
    const teorUrl =
      'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=1299653';

    it('attaches the PDF by URL and enables the native file parser', async () => {
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
      await client.generate(source({ urlInteiroTeor: teorUrl }));

      // Assert
      const init = fetch.mock.calls[0]?.[1];
      if (init === undefined) throw new Error('fetch não chamado');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const messages = body['messages'] as Array<Record<string, unknown>>;
      const content = messages[0]?.['content'] as Array<
        Record<string, unknown>
      >;
      const filePart = content.find((part) => part['type'] === 'file');
      const file = filePart?.['file'] as Record<string, unknown> | undefined;
      expect(file?.['file_data']).toBe(teorUrl);
      expect(body['plugins']).toEqual([
        { id: 'file-parser', pdf: { engine: 'native' } },
      ]);
    });

    it('keeps a text part alongside the attached PDF', async () => {
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
      await client.generate(source({ urlInteiroTeor: teorUrl }));

      // Assert
      const init = fetch.mock.calls[0]?.[1];
      if (init === undefined) throw new Error('fetch não chamado');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const messages = body['messages'] as Array<Record<string, unknown>>;
      const content = messages[0]?.['content'] as Array<
        Record<string, unknown>
      >;
      const textPart = content.find((part) => part['type'] === 'text');
      expect(typeof textPart?.['text']).toBe('string');
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

  describe('when the response carries diagnostic signal', () => {
    it('reports finish_reason and completion_tokens on truncated JSON', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: {
          choices: [
            { message: { content: '{"status":"gen' }, finish_reason: 'length' },
          ],
          usage: { prompt_tokens: 12000, completion_tokens: 4096 },
        },
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
      if (!outcome.ok) {
        expect(outcome.reason).toContain('finish_reason=length');
        expect(outcome.reason).toContain('completion_tokens=4096');
        expect(outcome.diagnostics?.finishReason).toBe('length');
        expect(outcome.diagnostics?.completionTokens).toBe(4096);
        expect(outcome.diagnostics?.contentTail).toBe('{"status":"gen');
      }
    });

    it('reports finish_reason when content is missing', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: {
          choices: [{ message: { content: null }, finish_reason: 'content_filter' }],
        },
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
      if (!outcome.ok) {
        expect(outcome.reason).toContain('content ausente');
        expect(outcome.reason).toContain('finish_reason=content_filter');
        expect(outcome.diagnostics?.finishReason).toBe('content_filter');
      }
    });

    it('surfaces an OpenRouter error returned inside a 200 body', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: {
          error: { message: 'PDF parser failed', code: 422 },
        },
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
      if (!outcome.ok) {
        expect(outcome.reason).toContain('PDF parser failed');
        expect(outcome.reason).toContain('code=422');
        expect(outcome.diagnostics?.openrouterError).toContain(
          'PDF parser failed',
        );
      }
    });

    it('flags failureKind source_too_large when the input exceeds the context window', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: {
          error: {
            message:
              'Your input exceeds the context window of this model. Please adjust your input and try again.',
            code: 502,
          },
        },
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
      if (!outcome.ok) {
        expect(outcome.failureKind).toBe('source_too_large');
      }
    });

    it('does not flag a transient 502 provider error as source_too_large', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: true,
        body: { error: { message: 'Provider returned error', code: 502 } },
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
      if (!outcome.ok) {
        expect(outcome.failureKind).toBeUndefined();
      }
    });

    it('includes the error body message on non-2xx status', async () => {
      // Arrange
      const fetch = makeFetch({
        ok: false,
        status: 429,
        body: { error: { message: 'Rate limited' } },
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
      if (!outcome.ok) {
        expect(outcome.reason).toContain('HTTP 429');
        expect(outcome.reason).toContain('Rate limited');
        expect(outcome.diagnostics?.httpStatus).toBe(429);
      }
    });
  });
});
