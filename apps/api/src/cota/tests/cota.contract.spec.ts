import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { cotaLegislaturaResponseSchema } from '@vota-comigo/shared-types';
import request from 'supertest';

import { CotaController } from '../cota.controller';
import { COTA_REPOSITORY, type CotaRepository } from '../cota.repository';
import { CotaService } from '../cota.service';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

async function createApp(
  repository: CotaRepository,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CotaController],
    providers: [
      CotaService,
      { provide: COTA_REPOSITORY, useValue: repository },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

function repository(overrides: Partial<CotaRepository> = {}): CotaRepository {
  return {
    loadLegislaturas: async () => [
      { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
    ],
    loadCoberturas: async () => [
      {
        year: 2023,
        coveredThroughMonth: 12,
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
      },
    ],
    loadCategorias: async () => [
      { externalNumSubCota: 1, description: 'MANUTENCAO DE ESCRITORIO' },
      { externalNumSubCota: 3, description: 'COMBUSTIVEIS E LUBRIFICANTES' },
    ],
    loadGastos: async () => [
      {
        deputadoId: 'deputado-a',
        year: 2023,
        gastosJson: { '2': { '1': 100_000, '3': 30_000 } },
      },
    ],
    loadGastosSigepa: async () => [],
    ...overrides,
  };
}

describe('GET /cota/legislatura', () => {
  describe('quando o agregado existe', () => {
    it('responde pelo contrato público', async () => {
      // Arrange
      const app = await createApp(repository());

      // Act
      const response = await request(getTestServer(app)).get(
        '/cota/legislatura',
      );

      // Assert
      expect(response.status).toBe(200);
      expect(() =>
        cotaLegislaturaResponseSchema.parse(response.body),
      ).not.toThrow();
      await app.close();
    });
  });

  describe('quando não há dado da cota para a legislatura', () => {
    it('responde 404 em vez de um agregado zerado', async () => {
      // Arrange
      const app = await createApp(
        repository({ loadCoberturas: async () => [] }),
      );

      // Act
      const response = await request(getTestServer(app)).get(
        '/cota/legislatura',
      );

      // Assert
      expect(response.status).toBe(404);
      await app.close();
    });
  });
});
