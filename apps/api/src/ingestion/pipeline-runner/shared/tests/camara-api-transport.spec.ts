import { createCamaraJsonTransport } from '../camara-api-transport';
import type { CamaraFetch } from '../camara-api-transport';

function transportWith(fetchImpl: CamaraFetch) {
  return createCamaraJsonTransport({ fetch: fetchImpl });
}

function headersOf(entries: Record<string, string>) {
  return { get: (name: string) => entries[name] ?? null };
}

describe('camara json transport', () => {
  describe('when the response is successful', () => {
    it('requests JSON and returns the parsed body', async () => {
      // Arrange
      const body = { dados: [{ id: 1 }], links: [] };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      });
      const transport = transportWith(fetchMock);

      // Act
      const response = await transport('https://example.test/historico');

      // Assert
      expect(response).toEqual({ ok: true, body });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.test/historico',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
    });
  });

  describe('when the response is an error', () => {
    it('reports the http kind, status, statusText and Retry-After header', async () => {
      // Arrange
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headersOf({
          'Retry-After': '5',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '60',
        }),
      });
      const transport = transportWith(fetchMock);

      // Act
      const response = await transport('https://example.test/historico');

      // Assert
      expect(response).toEqual({
        ok: false,
        kind: 'http',
        status: 429,
        statusText: 'Too Many Requests',
        retryAfter: '5',
        rateLimit: { limit: '1000', remaining: '0', reset: '60' },
      });
    });
  });

  describe('when the request times out', () => {
    it('maps the abort to a transient timeout failure instead of throwing', async () => {
      // Arrange
      const fetchMock = jest
        .fn()
        .mockRejectedValue(
          new DOMException('The operation timed out', 'TimeoutError'),
        );
      const transport = transportWith(fetchMock);

      // Act
      const response = await transport('https://example.test/historico');

      // Assert
      expect(response).toMatchObject({
        ok: false,
        status: 503,
        kind: 'timeout',
      });
    });

    it('passes an abort signal so the request cannot hang forever', async () => {
      // Arrange
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dados: [], links: [] }),
      });
      const transport = transportWith(fetchMock);

      // Act
      await transport('https://example.test/historico');

      // Assert
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('when the network fails', () => {
    it('maps the error to a transient network failure', async () => {
      // Arrange
      const fetchMock = jest
        .fn()
        .mockRejectedValue(new TypeError('fetch failed'));
      const transport = transportWith(fetchMock);

      // Act
      const response = await transport('https://example.test/historico');

      // Assert
      expect(response).toMatchObject({
        ok: false,
        status: 503,
        kind: 'network',
      });
    });
  });
});
