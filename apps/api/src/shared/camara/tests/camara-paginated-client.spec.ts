import { createCamaraPaginatedClient } from '../camara-paginated-client';
import type {
  CamaraJsonResponse,
  CamaraJsonTransport,
} from '../camara-json-transport';

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

describe('cliente paginado da Câmara', () => {
  describe('quando a consulta tem uma página', () => {
    it('devolve todos os itens recebidos', async () => {
      // Arrange
      const transport = transportReturning({
        ok: true,
        body: { dados: [{ idOrgao: 1 }], links: [] },
      });
      const client = createCamaraPaginatedClient({ transport });

      // Act
      const result = await client.fetchAll('https://example.test/orgaos');

      // Assert
      expect(result).toEqual({
        ok: true,
        items: [{ idOrgao: 1 }],
        pages: 1,
      });
    });
  });

  describe('quando a consulta tem várias páginas', () => {
    it('segue o link next e concatena os itens na ordem recebida', async () => {
      // Arrange
      const nextUrl = 'https://example.test/orgaos?pagina=2';
      const transport = transportReturning(
        {
          ok: true,
          body: {
            dados: [{ idOrgao: 1 }],
            links: [{ rel: 'next', href: nextUrl }],
          },
        },
        {
          ok: true,
          body: { dados: [{ idOrgao: 2 }], links: [] },
        },
      );
      const client = createCamaraPaginatedClient({ transport });

      // Act
      const result = await client.fetchAll('https://example.test/orgaos');

      // Assert
      expect(transport).toHaveBeenNthCalledWith(2, nextUrl);
      expect(result).toEqual({
        ok: true,
        items: [{ idOrgao: 1 }, { idOrgao: 2 }],
        pages: 2,
      });
    });
  });

  describe('quando uma página intermediária falha', () => {
    it('devolve falha sem expor os itens parciais', async () => {
      // Arrange
      const transport = transportReturning(
        {
          ok: true,
          body: {
            dados: [{ idOrgao: 1 }],
            links: [
              {
                rel: 'next',
                href: 'https://example.test/orgaos?pagina=2',
              },
            ],
          },
        },
        {
          ok: false,
          kind: 'http',
          status: 503,
          statusText: 'Service Unavailable',
        },
      );
      const client = createCamaraPaginatedClient({ transport });

      // Act
      const result = await client.fetchAll('https://example.test/orgaos');

      // Assert
      expect(result).toEqual({
        ok: false,
        kind: 'http',
        status: 503,
        message: 'Service Unavailable',
        pages: 1,
        receivedItems: 1,
      });
      expect(result).not.toHaveProperty('items');
    });
  });

  describe('quando a Câmara excede o timeout', () => {
    it('preserva a falha tipada de timeout', async () => {
      // Arrange
      const transport = transportReturning({
        ok: false,
        kind: 'timeout',
        status: 503,
        statusText: 'tempo limite de 5000ms excedido',
      });
      const client = createCamaraPaginatedClient({ transport });

      // Act
      const result = await client.fetchAll('https://example.test/orgaos');

      // Assert
      expect(result).toMatchObject({
        ok: false,
        kind: 'timeout',
        message: 'tempo limite de 5000ms excedido',
      });
    });
  });

  describe('quando a consulta não tem itens', () => {
    it('devolve sucesso com a lista vazia', async () => {
      // Arrange
      const transport = transportReturning({
        ok: true,
        body: { dados: [], links: [] },
      });
      const client = createCamaraPaginatedClient({ transport });

      // Act
      const result = await client.fetchAll('https://example.test/orgaos');

      // Assert
      expect(result).toEqual({ ok: true, items: [], pages: 1 });
    });
  });
});
