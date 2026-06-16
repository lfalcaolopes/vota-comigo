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
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    externalIdDeputado: 220593,
    nome: 'Maria Nome Cadastro',
    nomeCivil: 'Maria Aparecida da Silva',
    dataNascimento: '1980-05-10',
    municipioNascimento: 'São Paulo',
    ufNascimento: 'SP',
    urlRedeSocial: 'https://twitter.com/maria',
    externalIdLegislaturaInicial: 55,
    externalIdLegislaturaFinal: 57,
    eventos: [
      {
        dataHora: '2023-01-01T00:00:00+00:00',
        situacao: 'Exercício',
        descricaoStatus: 'Entrada - Posse',
        nomeEleitoral: 'Maria da Silva',
        siglaPartido: 'PT',
        siglaUf: 'SP',
        urlFoto: 'https://example.com/foto.jpg',
      },
    ],
    ...overrides,
  };
}

type VotacoesById = ReadonlyMap<
  string,
  Awaited<ReturnType<DeputadosRepository['loadVotacoesPlenarioForDeputado']>>
>;

function fakeRepository(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
  votacoesById: VotacoesById = new Map(),
): DeputadosRepository {
  return {
    loadDeputadoPerfil: async (externalIdDeputado) =>
      byExternalId.get(externalIdDeputado) ?? null,
    loadVotacoesPlenarioForDeputado: async (deputadoId) =>
      votacoesById.get(deputadoId) ?? [],
  };
}

async function buildApp(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
  votacoesById?: VotacoesById,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DeputadosController],
    providers: [
      DeputadosService,
      {
        provide: DEPUTADOS_REPOSITORY,
        useValue: fakeRepository(byExternalId, votacoesById),
      },
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
        [74, source({ externalIdDeputado: 74, eventos: [] })],
        [
          300,
          source({
            externalIdDeputado: 300,
            id: 'aaaaaaaa-0000-0000-0000-000000000300',
          }),
        ],
      ]),
      new Map([
        [
          'aaaaaaaa-0000-0000-0000-000000000300',
          [
            {
              dataHoraRegistro: '2023-06-01T12:00:00+00:00',
              data: '2023-06-01',
              voto: 'sim',
            },
          ],
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the deputado has history events', () => {
    it('returns a valid perfil contract parseable by the schema', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.externalIdDeputado).toBe(220593);
      expect(body.nomePublico).toBe('Maria da Silva');
      expect(body.fonteOficial).toBe(
        'https://www.camara.leg.br/deputados/220593',
      );
      expect(body.historicoParlamentarDisponivel).toBe(true);
    });

    it('populates snapshotPublico and flags snapshotPublicoDisponivel', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.snapshotPublicoDisponivel).toBe(true);
      expect(body.snapshotPublico).toEqual({
        nomeEleitoral: 'Maria da Silva',
        siglaPartido: 'PT',
        siglaUf: 'SP',
        urlFoto: 'https://example.com/foto.jpg',
      });
    });

    it('includes emAtividade derived from events', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(typeof body.emAtividade).toBe('boolean');
    });

    it('includes redesSociais', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.redesSociais).toEqual(['https://twitter.com/maria']);
    });

    it('includes nascimento and legislatura metadata', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.dataNascimento).toBe('1980-05-10');
      expect(body.municipioNascimento).toBe('São Paulo');
      expect(body.ufNascimento).toBe('SP');
      expect(body.externalIdLegislaturaInicial).toBe(55);
      expect(body.externalIdLegislaturaFinal).toBe(57);
    });

    it('does not expose an internal UUID id', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.body).not.toHaveProperty('id');
    });

    it('includes resumoPresencaDisponivel and resumoPresenca in the response', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(typeof body.resumoPresencaDisponivel).toBe('boolean');
      expect(
        body.resumoPresenca === null || typeof body.resumoPresenca === 'object',
      ).toBe(true);
    });

    it('includes historicoPartidario flagged as available', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoPartidarioDisponivel).toBe(true);
      expect(body.historicoPartidario).toEqual([
        {
          siglaPartido: 'PT',
          dataInicio: '2023-01-01',
          dataFim: null,
          atual: true,
        },
      ]);
    });
  });

  describe('when the deputado has no history events', () => {
    it('returns perfil with snapshot null and flags false', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/74');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoParlamentarDisponivel).toBe(false);
      expect(body.snapshotPublicoDisponivel).toBe(false);
      expect(body.snapshotPublico).toBeNull();
    });

    it('flags historicoPartidario as unavailable with an empty list', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/74');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoPartidarioDisponivel).toBe(false);
      expect(body.historicoPartidario).toEqual([]);
    });
  });

  describe('contract validity across gap states', () => {
    it('produces a snapshot-complete perfil with presenca available that parses', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/300');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.snapshotPublicoDisponivel).toBe(true);
      expect(body.resumoPresencaDisponivel).toBe(true);
      expect(body.resumoPresenca).not.toBeNull();
    });

    it('produces a history-available perfil with presenca unavailable that parses', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoParlamentarDisponivel).toBe(true);
      expect(body.resumoPresencaDisponivel).toBe(false);
      expect(body.resumoPresenca).toBeNull();
    });

    it('produces an all-unavailable perfil for a deputado without history that parses', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/74');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoPerfilSchema.parse(response.body as unknown);
      expect(body.historicoParlamentarDisponivel).toBe(false);
      expect(body.snapshotPublicoDisponivel).toBe(false);
      expect(body.resumoPresencaDisponivel).toBe(false);
      expect(body.historicoPartidarioDisponivel).toBe(false);
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
