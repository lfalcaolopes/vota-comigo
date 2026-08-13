import { Logger } from '@nestjs/common';

import type { DeputadosRepository } from '../deputados.repository';
import { DeputadosService } from '../deputados.service';
import type { DeputadoPerfilSource } from '../types/deputados.types';
import type { CamaraPaginatedClient } from '../../shared/camara/camara-paginated-client';

afterEach(() => {
  jest.restoreAllMocks();
});

function fakeRepository(
  overrides: Partial<DeputadosRepository>,
): DeputadosRepository {
  return {
    loadDeputadosFeed: async () => {
      throw new Error('should not load the full feed payload');
    },
    loadUfsDisponiveis: async () => [],
    loadPartidosDisponiveis: async () => [],
    loadDeputadoPerfil: async () => null,
    loadResumoPresenca: async () => null,
    loadDeputadoCeapSource: async () => ({
      coberturas: [],
      gasto: null,
      categorias: [],
      medianaUf: null,
      intervalosExercicio: [],
      datasInicioLegislatura: [],
    }),
    ...overrides,
  };
}

function perfilSource(): DeputadoPerfilSource {
  return {
    id: 'deputado-id',
    externalIdDeputado: 74646,
    nome: 'Aécio Neves',
    nomeCivil: 'Aécio Neves da Cunha',
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    urlRedeSocial: null,
    externalIdLegislaturaInicial: 54,
    externalIdLegislaturaFinal: 57,
    legislaturaInicialPeriodo: {
      dataInicio: '2015-02-01',
      dataFim: '2019-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    eventos: [],
  };
}

describe('DeputadosService availability lists', () => {
  describe('when deriving available UFs', () => {
    it('uses the dedicated distinct-uf source, not the full feed payload', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({ loadUfsDisponiveis: async () => ['SP', 'RJ'] }),
      );

      // Act
      const result = await service.ufsDisponiveis();

      // Assert
      expect(result.items).toEqual([{ siglaUf: 'RJ' }, { siglaUf: 'SP' }]);
    });
  });

  describe('when deriving available partidos', () => {
    it('uses the dedicated distinct-partido source, not the full feed payload', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({
          loadPartidosDisponiveis: async () => ['PT', 'PSOL'],
        }),
      );

      // Act
      const result = await service.partidosDisponiveis();

      // Assert
      expect(result.items).toEqual([
        { siglaPartido: 'PSOL' },
        { siglaPartido: 'PT' },
      ]);
    });
  });
});

describe('DeputadosService órgãos', () => {
  describe('quando o ano válido não tem vínculos', () => {
    it('devolve sucesso com uma lista vazia', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockResolvedValue({
          ok: true,
          items: [],
          pages: 1,
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = await service.orgaos(74646, 2022);

      // Assert
      expect(result).toEqual({ year: 2022, items: [], total: 0 });
      expect(client.fetchAll).toHaveBeenCalledWith(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/74646/orgaos?dataInicio=2022-01-01&dataFim=2022-12-31&itens=100&ordem=ASC&ordenarPor=dataInicio',
      );
    });
  });

  describe('quando o deputado não existe', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn(),
      };
      const service = new DeputadosService(fakeRepository({}), client);

      // Act
      const result = service.orgaos(999999, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 404 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn(),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = service.orgaos(74646, 2014);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 400 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });
});

describe('DeputadosService discursos', () => {
  describe('quando o ano está fora da faixa do deputado', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn(),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = service.discursos(74646, 2014);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 400 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando a consulta anual é concluída', () => {
    it('registra volume e lacunas sem registrar a transcrição', async () => {
      // Arrange
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockResolvedValue({
          ok: true,
          pages: 2,
          items: [
            {
              dataHoraInicio: '2022-08-16T15:42:00',
              tipoDiscurso: 'Discurso',
              transcricao: 'Conteúdo integral que não deve ser registrado.',
            },
          ],
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      await service.discursos(74646, 2022);

      // Assert
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'deputado_discursos_query',
          externalIdDeputado: 74646,
          year: 2022,
          pages: 2,
          receivedItems: 1,
          transformedItems: 1,
          externalResponseBytes: expect.any(Number),
          missingSummaryItems: 1,
          missingAssuntosItems: 1,
          missingLinksItems: 1,
        }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        'Conteúdo integral que não deve ser registrado.',
      );
    });
  });

  describe('quando uma página da Câmara falha', () => {
    it('invalida a seção sem devolver os itens das páginas anteriores', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockResolvedValue({
          ok: false,
          kind: 'network',
          message: 'falha na segunda página',
          pages: 1,
          receivedItems: 100,
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = service.discursos(74646, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 503 });
    });
  });

  describe('quando o ano válido não tem pronunciamentos', () => {
    it('devolve sucesso com uma lista vazia', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockResolvedValue({
          ok: true,
          items: [],
          pages: 1,
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = await service.discursos(74646, 2022);

      // Assert
      expect(result).toEqual({ year: 2022, items: [], total: 0 });
      expect(client.fetchAll).toHaveBeenCalledWith(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/74646/discursos?dataInicio=2022-01-01&dataFim=2022-12-31&itens=100&ordem=DESC&ordenarPor=dataHoraInicio',
      );
    });
  });

  describe('quando o deputado não existe', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn(),
      };
      const service = new DeputadosService(fakeRepository({}), client);

      // Act
      const result = service.discursos(999999, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 404 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });
});

describe('DeputadosService proposições assinadas', () => {
  describe('quando o ano tem proposições espalhadas pelos trimestres', () => {
    it('consulta os quatro intervalos e devolve o ano inteiro unido', async () => {
      // Arrange
      const byQuarter: Record<string, unknown[]> = {
        '2022-01-01': [
          {
            id: 2318532,
            siglaTipo: 'REQ',
            numero: 388,
            ano: 2022,
            ementa: 'Requer a criação da Comissão Especial.',
            dataApresentacao: '2022-03-23T16:06',
          },
        ],
        '2022-04-01': [
          {
            id: 2327419,
            siglaTipo: 'PL',
            numero: 1234,
            ano: 2022,
            ementa: 'Dispõe sobre transparência.',
            dataApresentacao: '2022-05-04T10:00',
          },
        ],
        '2022-07-01': [],
        '2022-10-01': [],
      };
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockImplementation((url: string) => {
          const start = new URL(url).searchParams.get(
            'dataApresentacaoInicio',
          ) as string;
          return Promise.resolve({
            ok: true,
            items: byQuarter[start],
            pages: 1,
          });
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(client.fetchAll).toHaveBeenCalledTimes(4);
      expect(result).toMatchObject({
        year: 2022,
        total: 2,
        items: [
          { externalIdProposicao: 2327419, dataApresentacao: '2022-05-04' },
          { externalIdProposicao: 2318532, dataApresentacao: '2022-03-23' },
        ],
      });
    });
  });

  describe('quando um dos trimestres falha', () => {
    it('derruba a seção em vez de publicar um total anual parcial', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockImplementation((url: string) => {
          const start = new URL(url).searchParams.get('dataApresentacaoInicio');
          if (start === '2022-07-01') {
            return Promise.resolve({
              ok: false,
              kind: 'timeout',
              message: 'timeout',
              pages: 0,
              receivedItems: 0,
            });
          }
          return Promise.resolve({
            ok: true,
            items: [
              {
                id: 2318532,
                siglaTipo: 'REQ',
                numero: 388,
                ano: 2022,
                ementa: 'Requer a criação da Comissão Especial.',
                dataApresentacao: '2022-03-23T16:06',
              },
            ],
            pages: 1,
          });
        }),
      };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = service.proposicoesAssinadas(74646, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 503 });
    });
  });

  describe('quando o deputado não existe', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const service = new DeputadosService(fakeRepository({}), client);

      // Act
      const result = service.proposicoesAssinadas(999999, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 404 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('rejeita a consulta antes de chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
        client,
      );

      // Act
      const result = service.proposicoesAssinadas(74646, 2014);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 400 });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });
});
