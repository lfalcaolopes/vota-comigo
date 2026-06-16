import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { deputadoPerfilSchema } from '@vota-comigo/shared-types';
import request from 'supertest';

import { DeputadosController } from '../deputados.controller';
import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from '../deputados.repository';
import { DeputadosService } from '../deputados.service';
import type { DeputadoPerfilSource } from '../types/deputados.types';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

function source(
  overrides: Partial<DeputadoPerfilSource> = {},
): DeputadoPerfilSource {
  return {
    externalIdDeputado: 220593,
    nome: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    temHistoricoParlamentar: true,
    ...overrides,
  };
}

function fakeRepository(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
): DeputadosRepository {
  return {
    loadDeputadoPerfil: async (externalIdDeputado) =>
      byExternalId.get(externalIdDeputado) ?? null,
  };
}

async function buildApp(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DeputadosController],
    providers: [
      DeputadosService,
      { provide: DEPUTADOS_REPOSITORY, useValue: fakeRepository(byExternalId) },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /deputados/:externalIdDeputado', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          74,
          source({ externalIdDeputado: 74, temHistoricoParlamentar: false }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the deputado is registered', () => {
    it('returns a valid perfil contract derived from the externalId', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body).toEqual({
        externalIdDeputado: 220593,
        nomePublico: 'Maria da Silva',
        nomeCivil: 'Maria Aparecida da Silva',
        fonteOficial: 'https://www.camara.leg.br/deputados/220593',
        historicoParlamentarDisponivel: true,
      });
    });

    it('does not expose an internal UUID id', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.body).not.toHaveProperty('id');
    });
  });

  describe('when the deputado has no parliamentary history', () => {
    it('still returns the perfil flagging the parliamentary history as unavailable', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/74');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoParlamentarDisponivel).toBe(false);
    });
  });

  describe('when no deputado is registered for the externalId', () => {
    it('returns 404', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('when the externalId is not an integer', () => {
    it('returns 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/abc');

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
