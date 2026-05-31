import { fetchCamaraJson } from '../camara-api-transport';

describe('fetchCamaraJson', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  describe('when the response is successful', () => {
    it('requests JSON and returns the parsed body', async () => {
      // Arrange
      const body = { dados: [{ id: 1 }], links: [] };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
      });
      global.fetch = fetchMock;

      // Act
      const response = await fetchCamaraJson('https://example.test/historico');

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
    it('reports the status, statusText and Retry-After header', async () => {
      // Arrange
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '5' : null),
        },
      });
      global.fetch = fetchMock;

      // Act
      const response = await fetchCamaraJson('https://example.test/historico');

      // Assert
      expect(response).toEqual({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        retryAfter: '5',
      });
    });
  });

  describe('when the request times out', () => {
    it('maps the abort to a transient failure instead of throwing', async () => {
      // Arrange
      const fetchMock = jest
        .fn()
        .mockRejectedValue(
          new DOMException('The operation timed out', 'TimeoutError'),
        );
      global.fetch = fetchMock;

      // Act
      const response = await fetchCamaraJson('https://example.test/historico');

      // Assert
      expect(response).toMatchObject({ ok: false, status: 503 });
    });

    it('passes an abort signal so the request cannot hang forever', async () => {
      // Arrange
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dados: [], links: [] }),
      });
      global.fetch = fetchMock;

      // Act
      await fetchCamaraJson('https://example.test/historico');

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('when the network fails', () => {
    it('maps the error to a transient failure', async () => {
      // Arrange
      const fetchMock = jest
        .fn()
        .mockRejectedValue(new TypeError('fetch failed'));
      global.fetch = fetchMock;

      // Act
      const response = await fetchCamaraJson('https://example.test/historico');

      // Assert
      expect(response).toMatchObject({ ok: false, status: 503 });
    });
  });
});
