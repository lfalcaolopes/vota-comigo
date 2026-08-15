import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { comparativoDeputadosResponseSchema } from '@vota-comigo/shared-types';
import request from 'supertest';

import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from '@/deputados/deputados.repository';
import type {
  DeputadoPerfilSource,
  LegislaturaSource,
} from '@/deputados/types/deputados.types';

import { ComparativoDeputadosController } from '../comparativo-deputados.controller';
import { ComparativoDeputadosService } from '../comparativo-deputados.service';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

const LEGISLATURAS: readonly LegislaturaSource[] = [
  {
    externalIdLegislatura: 54,
    dataInicio: '2011-02-01',
    dataFim: '2015-01-31',
  },
  {
    externalIdLegislatura: 57,
    dataInicio: '2023-02-01',
    dataFim: '2027-01-31',
  },
];

const DEPUTADO_ABAIXO_DO_PISO = 999998;

function perfilSource(
  externalIdDeputado: number,
  overrides: Partial<DeputadoPerfilSource> = {},
): DeputadoPerfilSource {
  return {
    id: `deputado-${externalIdDeputado}`,
    externalIdDeputado,
    nome: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Deputado ${externalIdDeputado} da Silva`,
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    urlRedeSocial: null,
    externalIdLegislaturaInicial: 56,
    externalIdLegislaturaFinal: 57,
    legislaturaInicialPeriodo: {
      dataInicio: '2019-02-01',
      dataFim: '2023-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    eventos: [
      {
        dataHora: '2023-02-01T00:00:00',
        situacao: 'Exercício',
        descricaoStatus: 'Titular',
        nomeEleitoral: `Deputado ${externalIdDeputado}`,
        siglaPartido: 'PT',
        siglaUf: 'MG',
        urlFoto: null,
      },
    ],
    ...overrides,
  };
}

function createRepository(): DeputadosRepository {
  return {
    loadDeputadosFeed: async () => ({ items: [], total: 0 }),
    loadUfsDisponiveis: async () => [],
    loadPartidosDisponiveis: async () => [],
    loadDeputadoPerfil: async (externalIdDeputado) => {
      if (externalIdDeputado === 220593 || externalIdDeputado === 204554) {
        return perfilSource(externalIdDeputado);
      }
      if (externalIdDeputado === DEPUTADO_ABAIXO_DO_PISO) {
        return perfilSource(externalIdDeputado, {
          externalIdLegislaturaFinal: 54,
          legislaturaFinalPeriodo: {
            dataInicio: '2011-02-01',
            dataFim: '2015-01-31',
          },
        });
      }
      return null;
    },
    loadResumoPresenca: async () => ({
      presencas: 90,
      ausenciasSemMotivoConhecido: 10,
    }),
    loadDeputadoCeapSource: async () => ({
      coberturas: [{ year: 2024, coveredThroughMonth: 12 }],
      gasto: { siglaUf: 'MG', gastosJson: { '1': { '1': 100_000 } } },
      categorias: [{ externalNumSubCota: 1, description: 'PASSAGENS AÉREAS' }],
      medianaUf: { amountUsedCents: 200_000, deputadoCount: 53 },
      intervalosExercicio: [
        { openedAt: '2019-02-01T00:00:00.000Z', closedAt: null },
      ],
      datasInicioLegislatura: ['2023-02-01T00:00:00.000Z'],
    }),
    loadDeputadoCotaJanelaSource: async (_deputadoId, years) => ({
      siglaUf: 'MG',
      anos: years.map((year) => ({
        year,
        coveredThroughMonth: 12,
        gastosJson: { '1': { '1': 100_000 } },
        medianaUf: { amountUsedCents: 200_000, deputadoCount: 53 },
      })),
      intervalosExercicio: [
        { openedAt: '2023-02-01T00:00:00.000Z', closedAt: null },
      ],
      datasInicioLegislatura: ['2023-02-01T00:00:00.000Z'],
    }),
    loadDeputadoOrgaos: async () => [],
    loadDeputadoOrgaosNaJanela: async () => [
      {
        externalIdOrgao: 2001,
        siglaOrgao: 'CCJC',
        nome: 'Comissão de Constituição e Justiça e de Cidadania',
        titulo: 'Suplente',
        dataInicio: '2023-03-01',
        dataFim: '2023-12-31',
      },
      {
        externalIdOrgao: 2001,
        siglaOrgao: 'CCJC',
        nome: 'Comissão de Constituição e Justiça e de Cidadania',
        titulo: 'Titular',
        dataInicio: '2024-03-01',
        dataFim: null,
      },
    ],
    loadDeputadoProposicoesAssinadasSource: async () => ({
      anoCoberto: true,
      assinaturasJson: { '2024-03-04': [4, 1] },
      coveredThroughDate: '2025-08-14',
    }),
    loadDeputadoProposicoesAssinadasJanela: async (_deputadoId, years) => ({
      anos: years.map((year) => ({
        year,
        coberto: true,
        assinaturasJson: { [`${year}-03-04`]: [4, 1] as const },
      })),
      coveredThroughDate: '2024-08-14',
    }),
    loadLegislaturas: async () => LEGISLATURAS,
    loadIntervalosExercicio: async (deputadoId) =>
      deputadoId === `deputado-${DEPUTADO_ABAIXO_DO_PISO}`
        ? []
        : [
            {
              openedAt: '2023-02-01T00:00:00.000Z',
              closedAt: '2024-06-15T00:00:00.000Z',
            },
          ],
  };
}

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ComparativoDeputadosController],
    providers: [
      ComparativoDeputadosService,
      { provide: DEPUTADOS_REPOSITORY, useValue: createRepository() },
    ],
  }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /comparativo-deputados', () => {
  describe('quando dois deputados são comparados na mesma janela', () => {
    it('responde pelo contrato público sem o valor absoluto da cota', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app))
        .get('/comparativo-deputados?ids=220593,204554')
        .expect(200);

      // Assert
      expect(
        comparativoDeputadosResponseSchema.safeParse(response.body).success,
      ).toBe(true);
      expect(response.body.items[0].cota).toMatchObject({
        status: 'comparavel',
        percentualSobreMedianaUf: 50,
        siglaUf: 'MG',
      });
      expect(JSON.stringify(response.body)).not.toContain('100000');
      await app.close();
    });

    it('soma a cota sobre todos os anos da janela, não sobre um ano', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app))
        .get('/comparativo-deputados?ids=220593,204554')
        .expect(200);

      // Assert
      expect(response.body.items[0].cota).toMatchObject({
        anosNaComparacao: 2,
      });
      expect(
        response.body.items[0].cota.anos.map(
          (ano: { year: number }) => ano.year,
        ),
      ).toEqual([2023, 2024]);
      await app.close();
    });

    it('responde a janela e as mesmas contagens do perfil para o item', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app))
        .get('/comparativo-deputados?ids=220593,204554')
        .expect(200);

      // Assert
      expect({
        janela: response.body.items[1].janela,
        proposicoesAssinadas: response.body.items[1].proposicoesAssinadas,
        orgaos: response.body.items[1].orgaos.total,
      }).toEqual({
        janela: {
          status: 'disponivel',
          legislatura: 57,
          dataInicio: '2023-02-01',
          dataFim: '2024-06-15T00:00:00.000Z',
          encerrada: true,
          diasEmExercicioDisponivel: true,
          diasEmExercicio: expect.any(Number),
          coberturaAte: '2024-08-14',
          divisorAnosEfetivos: expect.any(Number),
        },
        proposicoesAssinadas: {
          disponivel: true,
          total: 8,
          totalPrimeiroSignatario: 2,
          coveredThroughDate: '2024-08-14',
        },
        orgaos: 1,
      });
      await app.close();
    });

    it('ignora o parâmetro year legado sem falhar', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app))
        .get('/comparativo-deputados?ids=220593,204554&year=2020')
        .expect(200);

      // Assert
      expect(
        comparativoDeputadosResponseSchema.safeParse(response.body).success,
      ).toBe(true);
      await app.close();
    });
  });

  describe('quando um deputado está abaixo do piso da 55ª legislatura', () => {
    it('devolve a coluna recusada em vez de falhar a comparação inteira', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app))
        .get(`/comparativo-deputados?ids=220593,${DEPUTADO_ABAIXO_DO_PISO}`)
        .expect(200);

      // Assert
      expect(
        comparativoDeputadosResponseSchema.safeParse(response.body).success,
      ).toBe(true);
      expect(response.body.items[1]).toMatchObject({
        janela: {
          status: 'indisponivel',
          motivo: 'legislatura-anterior-a-cobertura',
          ultimaLegislatura: 54,
        },
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      });
      await app.close();
    });
  });

  describe('quando a lista de ids é inválida', () => {
    it('recusa um único deputado', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app)).get(
        '/comparativo-deputados?ids=220593',
      );

      // Assert
      expect(response.status).toBe(400);
      await app.close();
    });

    it('recusa ids repetidos', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app)).get(
        '/comparativo-deputados?ids=220593,220593',
      );

      // Assert
      expect(response.status).toBe(400);
      await app.close();
    });

    it('recusa mais de três deputados', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app)).get(
        '/comparativo-deputados?ids=1,2,3,4',
      );

      // Assert
      expect(response.status).toBe(400);
      await app.close();
    });

    it('recusa um id não numérico', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app)).get(
        '/comparativo-deputados?ids=220593,abc',
      );

      // Assert
      expect(response.status).toBe(400);
      await app.close();
    });
  });

  describe('quando um deputado não existe', () => {
    it('responde 404', async () => {
      // Arrange
      const app = await createApp();

      // Act
      const response = await request(getTestServer(app)).get(
        '/comparativo-deputados?ids=220593,999999',
      );

      // Assert
      expect(response.status).toBe(404);
      await app.close();
    });
  });
});
