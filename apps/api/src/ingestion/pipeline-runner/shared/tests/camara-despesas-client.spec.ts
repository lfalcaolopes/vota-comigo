import { createDeputadoDespesasClient } from '../camara-despesas-client';
import type {
  CamaraJsonResponse,
  CamaraJsonTransport,
} from '../camara-api-transport';

const BASE = 'https://dadosabertos.camara.leg.br/api/v2';

function despesaFor(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ano: 2025,
    mes: 8,
    tipoDespesa: 'PASSAGEM AÉREA - SIGEPA',
    codDocumento: '42E2BA01-F741-4045-92CF-D6EE4743AAF2',
    dataDocumento: '2025-08-11T00:00:00',
    valorDocumento: 1171.23,
    nomeFornecedor: 'Gol Linhas Aéreas',
    valorLiquido: 1171.23,
    valorGlosa: 0.0,
    ...overrides,
  };
}

function okResponse(
  dados: readonly Record<string, unknown>[],
  links: readonly Record<string, unknown>[] = [],
): CamaraJsonResponse {
  return { ok: true, body: { dados, links } };
}

function transportReturning(
  ...responses: readonly CamaraJsonResponse[]
): jest.MockedFunction<CamaraJsonTransport> {
  const transport = jest.fn<
    Promise<CamaraJsonResponse>,
    Parameters<CamaraJsonTransport>
  >();
  for (const response of responses) {
    transport.mockResolvedValueOnce(response);
  }
  return transport;
}

function clientWith(
  transport: CamaraJsonTransport,
  overrides: Partial<{
    sleep: (ms: number) => Promise<void>;
    maxAttempts: number;
    retryBackoffMs: readonly number[];
  }> = {},
) {
  return createDeputadoDespesasClient({
    transport,
    sleep: overrides.sleep ?? (() => Promise.resolve()),
    maxAttempts: overrides.maxAttempts ?? 3,
    retryBackoffMs: overrides.retryBackoffMs ?? [1000, 2000],
  });
}

const QUERY = {
  externalIdDeputado: 220593,
  year: 2025,
  externalIdLegislaturaList: [57],
};

describe('deputado despesas client', () => {
  describe('when the API returns a page of despesas', () => {
    it('queries the whole year with idLegislatura and keeps the fields the reposição uses', async () => {
      // Arrange
      const transport = transportReturning(okResponse([despesaFor()]));
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(transport).toHaveBeenCalledWith(
        `${BASE}/deputados/220593/despesas?ano=2025&idLegislatura=57&itens=100`,
      );
      expect(result).toEqual({
        ok: true,
        despesas: [
          {
            ano: 2025,
            mes: 8,
            tipoDespesa: 'PASSAGEM AÉREA - SIGEPA',
            valorLiquido: 1171.23,
          },
        ],
      });
    });

    it('keeps a negative valorLiquido as it came', async () => {
      // Arrange
      const transport = transportReturning(
        okResponse([despesaFor({ valorLiquido: -1171.23 })]),
      );
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        despesas: [expect.objectContaining({ valorLiquido: -1171.23 })],
      });
    });
  });

  describe('when the response is paginated', () => {
    it('follows rel=next until the end and aggregates every page', async () => {
      // Arrange
      const nextUrl = `${BASE}/deputados/220593/despesas?ano=2025&idLegislatura=57&pagina=2&itens=100`;
      const transport = transportReturning(
        okResponse([despesaFor({ mes: 8 })], [{ rel: 'next', href: nextUrl }]),
        okResponse([despesaFor({ mes: 9 })]),
      );
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(transport).toHaveBeenNthCalledWith(2, nextUrl);
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.despesas.map((despesa) => despesa.mes)).toEqual([8, 9]);
      }
    });
  });

  describe('when the deputado exercised on both sides of a change of legislatura', () => {
    it('queries every legislatura of the year and merges the results', async () => {
      // Arrange
      const transport = transportReturning(
        okResponse([despesaFor({ mes: 1 })]),
        okResponse([despesaFor({ mes: 2 })]),
      );
      const client = clientWith(transport);

      // Act
      const result = await client.fetch({
        externalIdDeputado: 220593,
        year: 2027,
        externalIdLegislaturaList: [57, 58],
      });

      // Assert
      expect(transport).toHaveBeenNthCalledWith(
        1,
        `${BASE}/deputados/220593/despesas?ano=2027&idLegislatura=57&itens=100`,
      );
      expect(transport).toHaveBeenNthCalledWith(
        2,
        `${BASE}/deputados/220593/despesas?ano=2027&idLegislatura=58&itens=100`,
      );
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.despesas.map((despesa) => despesa.mes)).toEqual([1, 2]);
      }
    });

    it('fails the whole query when one of the legislaturas fails', async () => {
      // Arrange
      const transport = transportReturning(okResponse([despesaFor()]), {
        ok: false,
        kind: 'http',
        status: 404,
        statusText: 'Not Found',
      });
      const client = clientWith(transport);

      // Act
      const result = await client.fetch({
        externalIdDeputado: 220593,
        year: 2027,
        externalIdLegislaturaList: [57, 58],
      });

      // Assert
      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('when the query carries no legislatura', () => {
    it('fails instead of asking the API, which would answer empty with HTTP 200', async () => {
      // Arrange
      const transport = transportReturning();
      const client = clientWith(transport);

      // Act
      const result = await client.fetch({
        externalIdDeputado: 220593,
        year: 2025,
        externalIdLegislaturaList: [],
      });

      // Assert
      expect(result).toEqual({
        ok: false,
        reason: 'consulta sem idLegislatura',
      });
      expect(transport).not.toHaveBeenCalled();
    });
  });

  describe('when the API answers HTTP 200 with no despesa', () => {
    it('succeeds with an empty result', async () => {
      // Arrange
      const transport = transportReturning(okResponse([]));
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(result).toEqual({ ok: true, despesas: [] });
    });
  });

  describe('when the API responds with a transient error', () => {
    it('retries respecting Retry-After and then succeeds', async () => {
      // Arrange
      const sleep = jest.fn().mockResolvedValue(undefined);
      const transport = transportReturning(
        {
          ok: false,
          kind: 'http',
          status: 429,
          statusText: 'Too Many Requests',
          retryAfter: '75',
        },
        okResponse([despesaFor()]),
      );
      const client = clientWith(transport, { sleep });

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(result.ok).toBe(true);
      expect(sleep).toHaveBeenCalledWith(75000);
      expect(transport).toHaveBeenCalledTimes(2);
    });

    it('reports each retry through onEvent with the deputado-ano being fetched', async () => {
      // Arrange
      const transport = transportReturning(
        {
          ok: false,
          kind: 'http',
          status: 503,
          statusText: 'Service Unavailable',
        },
        okResponse([despesaFor()]),
      );
      const client = clientWith(transport, { retryBackoffMs: [1000, 2000] });
      const events: unknown[] = [];

      // Act
      await client.fetch(QUERY, { onEvent: (event) => events.push(event) });

      // Assert
      expect(events).toEqual([
        {
          type: 'retry',
          externalIdDeputado: 220593,
          year: 2025,
          externalIdLegislatura: 57,
          attempt: 1,
          maxAttempts: 3,
          delayMs: 1000,
          reason: '503 Service Unavailable',
        },
      ]);
    });

    it('gives up after exhausting the attempts and reports the failure', async () => {
      // Arrange
      const unavailable: CamaraJsonResponse = {
        ok: false,
        kind: 'http',
        status: 503,
        statusText: 'Service Unavailable',
      };
      const transport = transportReturning(
        unavailable,
        unavailable,
        unavailable,
      );
      const client = clientWith(transport, { maxAttempts: 3 });

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('503');
      }
      expect(transport).toHaveBeenCalledTimes(3);
    });
  });

  describe('when the API responds with a non-transient error', () => {
    it('fails immediately without retrying', async () => {
      // Arrange
      const transport = transportReturning({
        ok: false,
        kind: 'http',
        status: 400,
        statusText: 'Bad Request',
      });
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(QUERY);

      // Assert
      expect(result.ok).toBe(false);
      expect(transport).toHaveBeenCalledTimes(1);
    });
  });
});
