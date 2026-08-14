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
    loadDeputadoOrgaos: async () => [],
    loadDeputadoProposicoesAssinadasSource: async () => ({
      anoCoberto: false,
      assinaturasJson: null,
      coveredThroughDate: null,
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
    it('devolve sucesso com uma lista vazia sem chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const loadDeputadoOrgaos = jest.fn().mockResolvedValue([]);
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoOrgaos,
        }),
        client,
      );

      // Act
      const result = await service.orgaos(74646, 2022);

      // Assert
      expect(result).toEqual({ year: 2022, items: [], total: 0 });
      expect(loadDeputadoOrgaos).toHaveBeenCalledWith('deputado-id', 2022);
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando há vínculos que cruzam a borda do ano', () => {
    it('preserva o vínculo iniciado antes e o vínculo ainda aberto', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoOrgaos: async () => [
            {
              externalIdOrgao: 2004,
              siglaOrgao: 'CCJC',
              nome: 'Comissão de Constituição e Justiça e de Cidadania',
              titulo: 'Titular',
              dataInicio: '2020-01-01',
              dataFim: '2022-01-15',
            },
            {
              externalIdOrgao: 180,
              siglaOrgao: 'PLEN',
              nome: 'Plenário',
              titulo: 'Titular',
              dataInicio: '2022-06-01',
              dataFim: null,
            },
          ],
        }),
        client,
      );

      // Act
      const result = await service.orgaos(74646, 2022);

      // Assert
      expect(result.total).toBe(2);
      expect(result.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            externalIdOrgao: 2004,
            dataFim: '2022-01-15',
          }),
          expect.objectContaining({ externalIdOrgao: 180, dataFim: null }),
        ]),
      );
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando o deputado não existe', () => {
    it('rejeita a consulta antes de ler os vínculos', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const loadDeputadoOrgaos = jest.fn();
      const service = new DeputadosService(
        fakeRepository({ loadDeputadoOrgaos }),
        client,
      );

      // Act
      const result = service.orgaos(999999, 2022);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 404 });
      expect(loadDeputadoOrgaos).not.toHaveBeenCalled();
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('rejeita a consulta antes de ler os vínculos', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const loadDeputadoOrgaos = jest.fn();
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoOrgaos,
        }),
        client,
      );

      // Act
      const result = service.orgaos(74646, 2014);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 400 });
      expect(loadDeputadoOrgaos).not.toHaveBeenCalled();
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
  describe('quando o ano está coberto e o deputado tem assinaturas', () => {
    it('soma os totais persistidos sem chamar a Câmara', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: true,
            assinaturasJson: {
              '2022-03-23': [2, 1],
              '2022-05-04': [1, 0],
            },
            coveredThroughDate: '2022-12-19',
          }),
        }),
        client,
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(result).toEqual({
        year: 2022,
        disponivel: true,
        total: 3,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2022-12-19',
      });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });

    it('expõe a fronteira da fonte, não a do ano consultado', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: true,
            assinaturasJson: { '2022-03-23': [2, 1] },
            coveredThroughDate: '2026-08-13',
          }),
        }),
        { fetchAll: jest.fn() },
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(result).toMatchObject({ coveredThroughDate: '2026-08-13' });
    });
  });

  describe('quando o ano está coberto mas o deputado não assinou nada', () => {
    it('devolve zeros disponíveis em vez de lacuna', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: true,
            assinaturasJson: null,
            coveredThroughDate: '2022-12-19',
          }),
        }),
        { fetchAll: jest.fn() },
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(result).toEqual({
        year: 2022,
        disponivel: true,
        total: 0,
        totalPrimeiroSignatario: 0,
        coveredThroughDate: '2022-12-19',
      });
    });
  });

  describe('quando o ano não foi coberto pela ingestão', () => {
    it('devolve disponivel false em vez de um total parcial', async () => {
      // Arrange
      const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: false,
            assinaturasJson: null,
            coveredThroughDate: '2026-08-13',
          }),
        }),
        client,
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(result).toEqual({ year: 2022, disponivel: false });
      expect(client.fetchAll).not.toHaveBeenCalled();
    });
  });

  describe('quando a Câmara estaria fora de alcance', () => {
    it('responde corretamente mesmo com o cliente da Câmara lançando', async () => {
      // Arrange
      const client: CamaraPaginatedClient = {
        fetchAll: jest.fn().mockRejectedValue(new Error('rede indisponível')),
      };
      const service = new DeputadosService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: true,
            assinaturasJson: { '2022-03-23': [2, 1] },
            coveredThroughDate: '2022-12-19',
          }),
        }),
        client,
      );

      // Act
      const result = await service.proposicoesAssinadas(74646, 2022);

      // Assert
      expect(result).toEqual({
        year: 2022,
        disponivel: true,
        total: 2,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2022-12-19',
      });
      expect(client.fetchAll).not.toHaveBeenCalled();
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
