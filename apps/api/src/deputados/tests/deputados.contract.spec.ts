import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  deputadoDiscursosResponseSchema,
  deputadoFeedResponseSchema,
  deputadoPerfilSchema,
  deputadoProposicoesAssinadasResponseSchema,
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
import {
  CAMARA_PAGINATED_CLIENT,
  type CamaraPaginatedClient,
} from '../../shared/camara/camara-paginated-client';
import { deriveSnapshotPublico } from '../rules/snapshot-publico';
import type {
  DeputadoCardRow,
  DeputadoPerfilSource,
  DeputadoResumoPresencaRow,
  DeputadosFeedFilters,
  DeputadosFeedPage,
  DeputadosFeedPagination,
} from '../types/deputados.types';

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

type ResumoById = ReadonlyMap<string, DeputadoResumoPresencaRow>;

// O feed filtra e pagina no SQL, entao o fake registra o que chegou ao
// repositorio: o que ainda e comportamento desta camada e a traducao da
// query string em filtros, nao a semantica do filtro em si.
type FeedCall = {
  filters: DeputadosFeedFilters;
  pagination: DeputadosFeedPagination;
};

const feedCalls: FeedCall[] = [];

function card(overrides: Partial<DeputadoCardRow> = {}): DeputadoCardRow {
  return {
    externalIdDeputado: 220593,
    nomePublico: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    siglaPartido: 'PT',
    siglaUf: 'SP',
    urlFoto: 'https://example.com/foto.jpg',
    emAtividade: true,
    ...overrides,
  };
}

function fakeRepository(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
  resumoById: ResumoById = new Map(),
  feedPage: DeputadosFeedPage = { items: [card()], total: 1 },
): DeputadosRepository {
  return {
    loadDeputadosFeed: async (filters, pagination) => {
      feedCalls.push({ filters, pagination });
      return feedPage;
    },
    loadUfsDisponiveis: async () =>
      [...byExternalId.values()].flatMap((source) => {
        const siglaUf = deriveSnapshotPublico(source.eventos)?.siglaUf;
        return siglaUf === undefined || siglaUf === null ? [] : [siglaUf];
      }),
    loadPartidosDisponiveis: async () =>
      [...byExternalId.values()].flatMap((source) => {
        const siglaPartido = deriveSnapshotPublico(
          source.eventos,
        )?.siglaPartido;
        return siglaPartido === undefined || siglaPartido === null
          ? []
          : [siglaPartido];
      }),
    loadDeputadoPerfil: async (externalIdDeputado) =>
      byExternalId.get(externalIdDeputado) ?? null,
    loadResumoPresenca: async (deputadoId) =>
      resumoById.get(deputadoId) ?? null,
    loadDeputadoCeapSource: async () => ({
      coberturas: [],
      gasto: null,
      categorias: [],
      medianaUf: null,
      intervalosExercicio: [],
      datasInicioLegislatura: [],
    }),
  };
}

async function buildApp(
  byExternalId: ReadonlyMap<number, DeputadoPerfilSource>,
  resumoById?: ResumoById,
  feedPage?: DeputadosFeedPage,
  camaraClient: CamaraPaginatedClient = {
    fetchAll: async () => {
      throw new Error('should not call the Câmara');
    },
  },
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DeputadosController],
    providers: [
      DeputadosService,
      {
        provide: CAMARA_PAGINATED_CLIENT,
        useValue: camaraClient,
      },
      {
        provide: DEPUTADOS_REPOSITORY,
        useValue: fakeRepository(byExternalId, resumoById, feedPage),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /deputados/:externalIdDeputado/proposicoes-assinadas', () => {
  describe('quando a Câmara devolve proposições do ano', () => {
    it('responde o ano inteiro pelo contrato público, sem paginação', async () => {
      // Arrange
      const app = await buildApp(
        new Map([[220593, source()]]),
        undefined,
        undefined,
        {
          fetchAll: async (url: string) => ({
            ok: true,
            pages: 1,
            items:
              new URL(url).searchParams.get('dataApresentacaoInicio') ===
              '2022-01-01'
                ? [
                    {
                      id: 2314871,
                      siglaTipo: 'RDF',
                      numero: 1,
                      ano: 0,
                      ementa: 'Aprova o texto do Acordo sobre a Mobilidade.',
                      dataApresentacao: '2022-02-09T23:59',
                    },
                  ]
                : [],
          }),
        },
      );

      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593/proposicoes-assinadas?year=2022',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoProposicoesAssinadasResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toEqual({
        year: 2022,
        items: [
          {
            externalIdProposicao: 2314871,
            siglaTipo: 'RDF',
            numero: 1,
            ano: null,
            ementa: 'Aprova o texto do Acordo sobre a Mobilidade.',
            dataApresentacao: '2022-02-09',
            urlOficial:
              'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2314871',
          },
        ],
        total: 1,
      });
      expect(response.body).not.toHaveProperty('limit');
      expect(response.body).not.toHaveProperty('offset');
      await app.close();
    });
  });

  describe('quando o deputado não existe no produto', () => {
    it('responde 404 sem consultar a Câmara', async () => {
      // Arrange
      const app = await buildApp(new Map());

      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/999999/proposicoes-assinadas?year=2022',
      );

      // Assert
      expect(response.status).toBe(404);
      await app.close();
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('responde erro de entrada sem consultar a Câmara', async () => {
      // Arrange
      const app = await buildApp(new Map([[220593, source()]]));

      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593/proposicoes-assinadas?year=2010',
      );

      // Assert
      expect(response.status).toBe(400);
      await app.close();
    });
  });
});

describe('GET /deputados/:externalIdDeputado/discursos', () => {
  describe('quando a Câmara devolve um pronunciamento com transcrição', () => {
    it('responde o ano inteiro pelo contrato público sem transcrição ou paginação', async () => {
      // Arrange
      const app = await buildApp(
        new Map([[220593, source()]]),
        undefined,
        undefined,
        {
          fetchAll: async () => ({
            ok: true,
            pages: 1,
            items: [
              {
                dataHoraInicio: '2022-08-16T15:42:00',
                tipoDiscurso: 'Discurso',
                sumario: 'Defesa da transparência pública.',
                transcricao: 'Texto integral restrito ao backend.',
              },
            ],
          }),
        },
      );

      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/220593/discursos?year=2022',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = deputadoDiscursosResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toEqual({
        year: 2022,
        items: [
          {
            dataHoraInicio: '2022-08-16T15:42:00',
            tipoDiscurso: 'Discurso',
            fase: null,
            sumario: 'Defesa da transparência pública.',
            assuntos: [],
            links: [],
          },
        ],
        total: 1,
      });
      expect(response.body).not.toHaveProperty('limit');
      expect(response.body).not.toHaveProperty('offset');
      expect(JSON.stringify(response.body)).not.toContain('transcricao');
      await app.close();
    });
  });
});

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

    it('reports the total coming from the repository, not the page size', async () => {
      // Arrange
      const paged = await buildApp(new Map([[220593, source()]]), undefined, {
        items: [card()],
        total: 137,
      });

      // Act
      const response = await request(getTestServer(paged)).get(
        '/deputados/feed?limit=1',
      );

      // Assert
      const body = deputadoFeedResponseSchema.parse(response.body as unknown);
      expect(body.total).toBe(137);
      expect(body.items).toHaveLength(1);
      await paged.close();
    });
  });
});

describe('GET /deputados/feed query string translation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Map([[220593, source()]]));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    feedCalls.length = 0;
  });

  describe('when no filter is given', () => {
    it('asks the repository for the default page with no filters', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed');

      // Assert
      expect(feedCalls).toEqual([
        {
          filters: {
            q: undefined,
            emAtividade: undefined,
            uf: undefined,
            partido: undefined,
          },
          pagination: { limit: 20, offset: 0 },
        },
      ]);
    });
  });

  describe('when pagination is given', () => {
    it('forwards limit and offset to the repository', async () => {
      // Act
      await request(getTestServer(app)).get(
        '/deputados/feed?limit=5&offset=40',
      );

      // Assert
      expect(feedCalls[0].pagination).toEqual({ limit: 5, offset: 40 });
    });
  });

  describe('when q is given', () => {
    it('forwards the trimmed term to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?q=%20aecio%20');

      // Assert
      expect(feedCalls[0].filters.q).toBe('aecio');
    });

    it('treats a blank term as absent', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?q=%20%20');

      // Assert
      expect(feedCalls[0].filters.q).toBeUndefined();
    });
  });

  describe('when emAtividade is given', () => {
    it('forwards the parsed boolean to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?emAtividade=true');

      // Assert
      expect(feedCalls[0].filters.emAtividade).toBe(true);
    });
  });

  describe('when uf is given in lowercase', () => {
    it('forwards it uppercased to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?uf=sp');

      // Assert
      expect(feedCalls[0].filters.uf).toBe('SP');
    });
  });

  describe('when partido has official punctuation', () => {
    it('accepts the sigla and forwards it to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?partido=pl*');

      // Assert
      expect(feedCalls[0].filters.partido).toBe('pl*');
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
          { presencas: 1, ausenciasSemMotivoConhecido: 0 },
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
