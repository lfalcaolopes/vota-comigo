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
  proposicoesAssinadasSource: DeputadosRepository['loadDeputadoProposicoesAssinadasSource'] = async () => ({
    anoCoberto: false,
    assinaturasJson: null,
    coveredThroughDate: null,
  }),
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
    loadResumoPresencaDaLegislatura: async () => null,
    loadDeputadoCeapSource: async () => ({
      coberturas: [],
      gasto: null,
      gastosSigepaJson: null,
      categorias: [],
      medianaUf: null,
      intervalosExercicio: [],
      datasInicioLegislatura: [],
    }),
    loadDeputadoOrgaos: async () => [],
    loadDeputadoProposicoesAssinadasSource: proposicoesAssinadasSource,
    loadDeputadoCotaJanelaSource: async () => ({
      siglaUf: null,
      anos: [],
      intervalosExercicio: [],
      datasInicioLegislatura: [],
    }),
    loadDeputadoOrgaosNaJanela: async () => [],
    loadDeputadoProposicoesAssinadasJanela: async () => ({
      anos: [],
      coveredThroughDate: null,
    }),
    loadLegislaturas: async () => [],
    loadIntervalosExercicio: async () => [],
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
  proposicoesAssinadasSource?: DeputadosRepository['loadDeputadoProposicoesAssinadasSource'],
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
        useValue: fakeRepository(
          byExternalId,
          resumoById,
          feedPage,
          proposicoesAssinadasSource,
        ),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /deputados/:externalIdDeputado/proposicoes-assinadas', () => {
  describe('quando o ano está coberto e o deputado tem assinaturas', () => {
    it('responde os totais pelo contrato público, sem consultar a Câmara', async () => {
      // Arrange
      const app = await buildApp(
        new Map([[220593, source()]]),
        undefined,
        undefined,
        undefined,
        async () => ({
          anoCoberto: true,
          assinaturasJson: {
            '2022-03-23': [2, 1],
            '2022-05-04': [1, 0],
          },
          coveredThroughDate: '2026-08-13',
        }),
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
        disponivel: true,
        total: 3,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2026-08-13',
      });
      expect(response.body).not.toHaveProperty('items');
      await app.close();
    });
  });

  describe('quando a fronteira da fonte é anterior ao ano consultado', () => {
    it('rejeita a resposta pelo contrato público', () => {
      // Arrange
      const response = {
        year: 2026,
        disponivel: true,
        total: 3,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2025-12-19',
      };

      // Act
      const result =
        deputadoProposicoesAssinadasResponseSchema.safeParse(response);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('quando o ano não foi coberto pela ingestão', () => {
    it('responde disponivel false pelo contrato público', async () => {
      // Arrange
      const app = await buildApp(
        new Map([[220593, source()]]),
        undefined,
        undefined,
        undefined,
        async () => ({
          anoCoberto: false,
          assinaturasJson: null,
          coveredThroughDate: null,
        }),
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
      expect(body).toEqual({ year: 2022, disponivel: false });
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

  describe('validação do contrato', () => {
    it('aceita disponivel false sem os campos de total', () => {
      // Arrange
      const body = { year: 2018, disponivel: false };

      // Act / Assert
      expect(() =>
        deputadoProposicoesAssinadasResponseSchema.parse(body),
      ).not.toThrow();
    });

    it('rejeita totalPrimeiroSignatario maior que o total', () => {
      // Arrange
      const body = {
        year: 2022,
        disponivel: true,
        total: 2,
        totalPrimeiroSignatario: 3,
      };

      // Act / Assert
      expect(() =>
        deputadoProposicoesAssinadasResponseSchema.parse(body),
      ).toThrow();
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
            ufs: undefined,
            partidos: undefined,
            sexo: undefined,
            faixasEtarias: undefined,
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
      expect(feedCalls[0].filters.ufs).toEqual(['SP']);
    });
  });

  describe('when partido has official punctuation', () => {
    it('accepts the sigla and forwards it to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?partido=pl*');

      // Assert
      expect(feedCalls[0].filters.partidos).toEqual(['pl*']);
    });
  });

  describe('when uf and partido are repeated', () => {
    it('forwards every value as a list', async () => {
      // Act
      await request(getTestServer(app)).get(
        '/deputados/feed?uf=SP&uf=rj&partido=PT&partido=PL',
      );

      // Assert
      expect(feedCalls[0].filters.ufs).toEqual(['SP', 'RJ']);
      expect(feedCalls[0].filters.partidos).toEqual(['PT', 'PL']);
    });

    it('collapses repeated values so the same filter is not sent twice', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?uf=SP&uf=sp');

      // Assert
      expect(feedCalls[0].filters.ufs).toEqual(['SP']);
    });
  });

  describe('when sexo is given', () => {
    it('forwards the parsed sigla to the repository', async () => {
      // Act
      await request(getTestServer(app)).get('/deputados/feed?sexo=f');

      // Assert
      expect(feedCalls[0].filters.sexo).toBe('F');
    });
  });

  describe('when faixaEtaria is repeated', () => {
    it('forwards every parsed faixa to the repository', async () => {
      // Act
      await request(getTestServer(app)).get(
        '/deputados/feed?faixaEtaria=40-49&faixaEtaria=70-mais',
      );

      // Assert
      expect(feedCalls[0].filters.faixasEtarias).toEqual(['40-49', '70-mais']);
    });
  });
});

describe('GET /deputados/feed with invalid filters', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Map([[220593, source()]]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when sexo is not a known sigla', () => {
    it('returns 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?sexo=X',
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when faixaEtaria is not a known range', () => {
    it('returns 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?faixaEtaria=30-39',
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when one repeated uf is invalid', () => {
    it('returns 400 instead of silently dropping it', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/deputados/feed?uf=SP&uf=BRASIL',
      );

      // Assert
      expect(response.status).toBe(400);
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
