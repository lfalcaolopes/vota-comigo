import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  deputadoFeedResponseSchema,
  deputadoPerfilSchema,
  partidosDisponiveisResponseSchema,
  ufsDisponiveisResponseSchema,
} from '@vota-comigo/shared-types';
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
    legislaturaInicialPeriodo: {
      dataInicio: '2015-02-01',
      dataFim: '2019-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
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
    loadDeputadosFeed: async () => [...byExternalId.values()],
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

describe('GET /deputados/feed', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Map([[220593, source()]]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when deputados are available', () => {
    it('returns a valid feed contract parseable by the schema', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/deputados/feed');

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body).toEqual({
        items: [
          {
            externalIdDeputado: 220593,
            nomePublico: 'Maria da Silva',
            nomeCivil: 'Maria Aparecida da Silva',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: 'https://example.com/foto.jpg',
            emAtividade: true,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });
  });
});

describe('GET /deputados/feed?q=', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            nome: 'Aécio Nome Cadastro',
            nomeCivil: 'Aécio Pereira',
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'Aécio Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
        [
          220595,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000003',
            externalIdDeputado: 220595,
            nome: 'Ana Nome Cadastro',
            nomeCivil: 'Ana Pereira',
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'Ana Pereira',
                siglaPartido: 'PL*',
                siglaUf: 'MG',
                urlFoto: null,
              },
            ],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when q matches a public name with different casing', () => {
    it('returns only matching deputados', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?q=maria',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.externalIdDeputado)).toEqual([
        220593,
      ]);
    });
  });

  describe('when q omits accents from a public name', () => {
    it('returns deputados whose names contain the accented form', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?q=aecio',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.nomePublico)).toEqual([
        'Aécio Pereira',
      ]);
    });
  });

  describe('when partido has official punctuation', () => {
    it('accepts the sigla and matches case-insensitively', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?partido=pl*',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.siglaPartido)).toEqual(['PL*']);
    });
  });
});

describe('GET /deputados/feed?emAtividade=true', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            eventos: [
              {
                dataHora: '2019-02-01T12:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse de Eleito Titular',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
              {
                dataHora: '2023-01-31T23:59:00+00:00',
                situacao: 'Fim de Mandato',
                descricaoStatus: 'Saída - Término da Legislatura',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the activity filter is enabled', () => {
    it('returns only deputados currently in activity', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?emAtividade=true',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.externalIdDeputado)).toEqual([
        220593,
      ]);
    });
  });
});

describe('GET /deputados/feed?uf=', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            nome: 'José Nome Cadastro',
            nomeCivil: 'José Pereira',
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when uf matches one latest public snapshot', () => {
    it('returns only deputados from that UF', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?uf=SP',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.siglaUf)).toEqual(['SP']);
    });
  });
});

describe('GET /deputados/feed?partido=', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            nome: 'José Nome Cadastro',
            nomeCivil: 'José Pereira',
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when partido matches one latest public snapshot', () => {
    it('returns only deputados from that partido', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?partido=PT',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(1);
      expect(body.items.map((item) => item.siglaPartido)).toEqual(['PT']);
    });
  });
});

describe('GET /deputados/feed with invalid pagination', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Map([[220593, source()]]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when limit is below the accepted range', () => {
    it('returns 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?limit=0',
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

describe('GET /deputados/feed with invalid partido', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Map([[220593, source()]]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when partido has invalid characters', () => {
    it('returns 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?partido=PT-SP',
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

describe('GET /deputados/feed/ufs', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
        [
          220595,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000003',
            externalIdDeputado: 220595,
            eventos: [],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when deputados have public snapshots', () => {
    it('returns distinct available UFs sorted alphabetically', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed/ufs',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = ufsDisponiveisResponseSchema.parse(response.body as unknown);
      expect(body.items).toEqual([{ siglaUf: 'RJ' }, { siglaUf: 'SP' }]);
    });
  });
});

describe('GET /deputados/feed/partidos', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(
      new Map([
        [220593, source()],
        [
          220594,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000002',
            externalIdDeputado: 220594,
            eventos: [
              {
                dataHora: '2023-01-01T00:00:00+00:00',
                situacao: 'Exercício',
                descricaoStatus: 'Entrada - Posse',
                nomeEleitoral: 'José Pereira',
                siglaPartido: 'PSOL',
                siglaUf: 'RJ',
                urlFoto: null,
              },
            ],
          }),
        ],
        [
          220595,
          source({
            id: 'aaaaaaaa-0000-0000-0000-000000000003',
            externalIdDeputado: 220595,
            eventos: [],
          }),
        ],
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when deputados have public snapshots', () => {
    it('returns distinct available partidos sorted alphabetically', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed/partidos',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = partidosDisponiveisResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.items).toEqual([
        { siglaPartido: 'PSOL' },
        { siglaPartido: 'PT' },
      ]);
    });
  });
});

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
      expect(body.legislaturaInicialPeriodo).toEqual({
        dataInicio: '2015-02-01',
        dataFim: '2019-01-31',
      });
      expect(body.legislaturaFinalPeriodo).toEqual({
        dataInicio: '2023-02-01',
        dataFim: '2027-01-31',
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
