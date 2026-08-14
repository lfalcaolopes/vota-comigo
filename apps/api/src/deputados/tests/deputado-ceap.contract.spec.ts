import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { deputadoCeapResponseSchema } from '@vota-comigo/shared-types';
import request from 'supertest';

import { DeputadosController } from '../deputados.controller';
import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from '../deputados.repository';
import { DeputadosService } from '../deputados.service';
import {
  CAMARA_PAGINATED_CLIENT,
  type CamaraPaginatedClient,
} from '../../shared/camara/camara-paginated-client';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

describe('GET /deputados/:externalIdDeputado/ceap', () => {
  describe('quando o ano válido ainda não foi carregado', () => {
    it('responde o estado próprio pelo contrato público', async () => {
      // Arrange
      const repository: DeputadosRepository = {
        loadDeputadosFeed: async () => ({ items: [], total: 0 }),
        loadUfsDisponiveis: async () => [],
        loadPartidosDisponiveis: async () => [],
        loadResumoPresenca: async () => null,
        loadDeputadoPerfil: async () => ({
          id: 'deputado-id',
          externalIdDeputado: 220593,
          nome: 'Maria',
          nomeCivil: 'Maria da Silva',
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
          eventos: [],
        }),
        loadDeputadoCeapSource: async () => ({
          coberturas: [{ year: 2024, coveredThroughMonth: 12 }],
          gasto: null,
          categorias: [],
          medianaUf: null,
          intervalosExercicio: [],
          datasInicioLegislatura: [],
        }),
        loadDeputadoOrgaos: async () => [],
      };
      const camaraClient: CamaraPaginatedClient = {
        fetchAll: async () => {
          throw new Error('should not call the Câmara');
        },
      };
      const moduleRef = await Test.createTestingModule({
        controllers: [DeputadosController],
        providers: [
          DeputadosService,
          { provide: DEPUTADOS_REPOSITORY, useValue: repository },
          { provide: CAMARA_PAGINATED_CLIENT, useValue: camaraClient },
        ],
      }).compile();
      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      // Act
      const response = await request(getTestServer(app))
        .get('/deputados/220593/ceap?year=2022')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        year: 2022,
        availableYears: [2024],
        status: 'ano-nao-carregado',
      });
      expect(deputadoCeapResponseSchema.safeParse(response.body).success).toBe(
        true,
      );
      await app.close();
    });
  });
});
