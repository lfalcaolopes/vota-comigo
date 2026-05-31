import { createDeputadoHistoricoClient } from '../camara-historico-client';
import type {
  CamaraJsonResponse,
  CamaraJsonTransport,
} from '../camara-api-transport';

const BASE = 'https://dadosabertos.camara.leg.br/api/v2';

function dado(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 220593,
    uri: `${BASE}/deputados/220593`,
    dataHora: '2023-02-01T15:00',
    situacao: 'Exercício',
    condicaoEleitoral: 'Titular',
    descricaoStatus: 'Entrada - Posse de Eleito Titular',
    siglaPartido: 'PT',
    uriPartido: `${BASE}/partidos/13`,
    idLegislatura: 57,
    nome: 'Fulano de Tal',
    nomeEleitoral: 'FULANO',
    siglaUf: 'SP',
    email: 'fulano@camara.leg.br',
    urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/220593.jpg',
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
  return createDeputadoHistoricoClient({
    transport,
    sleep: overrides.sleep ?? (() => Promise.resolve()),
    maxAttempts: overrides.maxAttempts ?? 3,
    retryBackoffMs: overrides.retryBackoffMs ?? [1000, 2000],
  });
}

describe('deputado historico client', () => {
  describe('when the API returns a page of events', () => {
    it('requests the deputado history endpoint and maps the source fields', async () => {
      // Arrange
      const transport = transportReturning(okResponse([dado()]));
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(220593);

      // Assert
      expect(transport).toHaveBeenCalledWith(
        `${BASE}/deputados/220593/historico`,
      );
      expect(result).toEqual({
        ok: true,
        eventos: [
          {
            dataHora: '2023-02-01T15:00',
            situacao: 'Exercício',
            condicaoEleitoral: 'Titular',
            descricaoStatus: 'Entrada - Posse de Eleito Titular',
            siglaPartido: 'PT',
            uriPartido: `${BASE}/partidos/13`,
            idLegislatura: 57,
            nome: 'Fulano de Tal',
            nomeEleitoral: 'FULANO',
            siglaUf: 'SP',
            email: 'fulano@camara.leg.br',
            urlFoto:
              'https://www.camara.leg.br/internet/deputado/bandep/220593.jpg',
          },
        ],
      });
    });

    it('keeps null situacao, condicaoEleitoral and email as null', async () => {
      // Arrange
      const transport = transportReturning(
        okResponse([
          dado({ situacao: null, condicaoEleitoral: null, email: null }),
        ]),
      );
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(220593);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        eventos: [
          expect.objectContaining({
            situacao: null,
            condicaoEleitoral: null,
            email: null,
          }),
        ],
      });
    });
  });

  describe('when the response is paginated', () => {
    it('follows rel=next and concatenates every page in order', async () => {
      // Arrange
      const nextUrl = `${BASE}/deputados/220593/historico?pagina=2`;
      const transport = transportReturning(
        okResponse(
          [dado({ descricaoStatus: 'page-1' })],
          [{ rel: 'next', href: nextUrl }],
        ),
        okResponse([dado({ descricaoStatus: 'page-2' })]),
      );
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(220593);

      // Assert
      expect(transport).toHaveBeenNthCalledWith(2, nextUrl);
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.eventos.map((e) => e.descricaoStatus)).toEqual([
          'page-1',
          'page-2',
        ]);
      }
    });
  });

  describe('when the API responds with a transient error', () => {
    it('retries respecting Retry-After and then succeeds', async () => {
      // Arrange
      const sleep = jest.fn().mockResolvedValue(undefined);
      const transport = transportReturning(
        {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          retryAfter: '3',
        },
        okResponse([dado()]),
      );
      const client = clientWith(transport, { sleep });

      // Act
      const result = await client.fetch(220593);

      // Assert
      expect(result.ok).toBe(true);
      expect(sleep).toHaveBeenCalledWith(3000);
      expect(transport).toHaveBeenCalledTimes(2);
    });

    it('reports each retry through onEvent with the attempt details', async () => {
      // Arrange
      const transport = transportReturning(
        { ok: false, status: 503, statusText: 'Service Unavailable' },
        okResponse([dado()]),
      );
      const client = clientWith(transport, { retryBackoffMs: [1000, 2000] });
      const events: unknown[] = [];

      // Act
      await client.fetch(220593, { onEvent: (event) => events.push(event) });

      // Assert
      expect(events).toEqual([
        {
          type: 'retry',
          externalIdDeputado: 220593,
          attempt: 1,
          maxAttempts: 3,
          delayMs: 1000,
          reason: '503 Service Unavailable',
        },
      ]);
    });

    it('gives up after exhausting the attempts and reports the failure', async () => {
      // Arrange
      const transport = transportReturning(
        { ok: false, status: 503, statusText: 'Service Unavailable' },
        { ok: false, status: 503, statusText: 'Service Unavailable' },
        { ok: false, status: 503, statusText: 'Service Unavailable' },
      );
      const client = clientWith(transport, { maxAttempts: 3 });

      // Act
      const result = await client.fetch(220593);

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
        status: 404,
        statusText: 'Not Found',
      });
      const client = clientWith(transport);

      // Act
      const result = await client.fetch(220593);

      // Assert
      expect(result.ok).toBe(false);
      expect(transport).toHaveBeenCalledTimes(1);
    });
  });
});
