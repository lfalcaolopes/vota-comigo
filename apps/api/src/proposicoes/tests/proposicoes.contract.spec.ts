import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  proposicaoDetalheSchema,
  proposicoesFeedResponseSchema,
  proposicoesSearchResponseSchema,
} from '@vota-comigo/shared-types';
import request from 'supertest';

import { ProposicoesController } from '../proposicoes.controller';
import type {
  ProposicaoDetalheHead,
  ProposicaoDetalheResult,
  ProposicaoVotacaoJoinRow,
  ProposicoesRepository,
  VotacaoDetalheRow,
} from '../proposicoes.repository';
import { PROPOSICOES_REPOSITORY } from '../proposicoes.repository';
import { ProposicoesService } from '../proposicoes.service';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre saúde pública',
    dataApresentacao: '2024-04-15T10:00:00Z',
    ultimoStatusSiglaOrgao: 'PLEN',
    ultimoStatusDescricaoSituacao: 'Aprovada',
    ultimoStatusRegime: 'Urgência',
    ultimoStatusDataHora: '2024-06-01T10:00:00Z',
    externalIdVotacao: '1-1',
    data: '2024-05-01',
    dataHoraRegistro: '2024-05-01T12:00:00Z',
    descricao: 'Aprovado o Projeto de Lei',
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: 300,
    votosNao: 100,
    votosOutros: 5,
    aprovacao: 1,
    ...overrides,
  };
}

function detalheHead(
  overrides: Partial<ProposicaoDetalheHead> = {},
): ProposicaoDetalheHead {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre saúde pública',
    dataApresentacao: '2024-04-15T10:00:00Z',
    ementaDetalhada: 'Detalha regras de saúde pública.',
    ultimoStatusSiglaOrgao: 'PLEN',
    ultimoStatusDescricaoSituacao: 'Aprovada',
    ultimoStatusRegime: 'Urgência',
    ultimoStatusDataHora: '2024-06-01T10:00:00Z',
    ...overrides,
  };
}

function votacaoDetalheRow(
  overrides: Partial<VotacaoDetalheRow> = {},
): VotacaoDetalheRow {
  return {
    externalIdVotacao: '1-1',
    data: '2024-05-01',
    dataHoraRegistro: '2024-05-01T12:00:00Z',
    descricao: 'Aprovado o Projeto de Lei',
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: 300,
    votosNao: 100,
    votosOutros: 5,
    aprovacao: 1,
    votacaoVotosExternalId: '1-1',
    votacaoVotosSim: 300,
    votacaoVotosNao: 100,
    votosAbstencao: 3,
    votosObstrucao: 1,
    votosArtigo17: 1,
    votosNaoInformado: 0,
    ...overrides,
  };
}

type FakeData = {
  lista?: readonly ProposicaoVotacaoJoinRow[];
  detalhe?: ReadonlyMap<number, ProposicaoDetalheResult>;
};

function fakeRepository(data: FakeData): ProposicoesRepository {
  return {
    loadProposicoesWithVotacoesPlenario: async () => data.lista ?? [],
    loadProposicaoDetalhe: async (externalIdProposicao) =>
      data.detalhe?.get(externalIdProposicao) ?? null,
  };
}

async function buildApp(data: FakeData): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProposicoesController],
    providers: [
      ProposicoesService,
      { provide: PROPOSICOES_REPOSITORY, useValue: fakeRepository(data) },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('GET /proposicoes/feed', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({ lista: [joinRow()] });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when no pagination is provided', () => {
    it('applies the default limit 20 and offset 0 and returns a valid contract', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/feed',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toMatchObject({ limit: 20, offset: 0 });
    });

    it('does not expose an internal UUID id on the card', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/feed',
      );

      // Assert
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.items[0]).not.toHaveProperty('id');
      expect(body.items[0].externalIdProposicao).toBe(1);
    });
  });

  describe('when limit and offset are out of range', () => {
    it('caps limit at 100 and floors offset at 0', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/feed')
        .query({ limit: 999, offset: -5 });

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toMatchObject({ limit: 100, offset: 0 });
    });

    it('raises a zero limit to 1', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/feed')
        .query({ limit: 0 });

      // Assert
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.limit).toBe(1);
    });
  });

  describe('when limit or offset are not integers', () => {
    it.each(['abc', '20.5'])('rejects limit=%s with 400', async (limit) => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/feed')
        .query({ limit });

      // Assert
      expect(response.status).toBe(400);
    });

    it('rejects a non-integer offset with 400', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/feed')
        .query({ offset: 'abc' });

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

describe('GET /proposicoes/feed with ordenacao param', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({
      lista: [
        joinRow({
          externalIdProposicao: 1,
          dataApresentacao: '2024-06-01T00:00:00Z',
          externalIdVotacao: '1-1',
        }),
        joinRow({
          externalIdProposicao: 2,
          dataApresentacao: '2022-03-10T00:00:00Z',
          externalIdVotacao: '2-1',
        }),
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when ordenacao=mais-recentes', () => {
    it('returns a valid contract ordered by date descending', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/feed')
        .query({ ordenacao: 'mais-recentes' });

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.items.map((item) => item.externalIdProposicao)).toEqual([
        1, 2,
      ]);
    });
  });

  describe('when ordenacao is absent', () => {
    it('defaults to mais-votadas and returns a valid contract', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/feed',
      );

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesFeedResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.items).toHaveLength(2);
    });
  });

  describe('when ordenacao is an invalid value', () => {
    it.each(['invalida', 'random', '123'])(
      'rejects ordenacao=%s with 400',
      async (ordenacao) => {
        // Act
        const response = await request(getTestServer(app))
          .get('/proposicoes/feed')
          .query({ ordenacao });

        // Assert
        expect(response.status).toBe(400);
      },
    );
  });
});

describe('GET /proposicoes/feed as initial matcher suggestion source', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({
      lista: Array.from({ length: 6 }, (_unused, index) => {
        const externalIdProposicao = index + 1;
        return joinRow({
          externalIdProposicao,
          numero: 100 + externalIdProposicao,
          ementa: `Proposição sugerida ${externalIdProposicao}`,
          externalIdVotacao: `${externalIdProposicao}-1`,
          votosSim: 300 - index,
          votosNao: 100 + index,
        });
      }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves five public cards when the initial matcher flow requests limit 5', async () => {
    // Act
    const response = await request(getTestServer(app))
      .get('/proposicoes/feed')
      .query({ limit: 5 });

    // Assert
    expect(response.status).toBe(200);
    const body = proposicoesFeedResponseSchema.parse(response.body as unknown);
    expect(body.limit).toBe(5);
    expect(body.items).toHaveLength(5);
    expect(body.total).toBe(6);
    expect(body.items.map((item) => item.externalIdProposicao)).toHaveLength(5);
  });
});

describe('GET /proposicoes/feed with no computavel proposicao', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({
      lista: [joinRow({ descricao: 'Requerimento de retirada de pauta' })],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an empty page instead of an error', async () => {
    // Act
    const response = await request(getTestServer(app)).get('/proposicoes/feed');

    // Assert
    expect(response.status).toBe(200);
    const body = proposicoesFeedResponseSchema.parse(response.body as unknown);
    expect(body).toMatchObject({ items: [], total: 0 });
  });
});

describe('GET /proposicoes/search', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({
      lista: [
        joinRow({ externalIdProposicao: 1, ementa: 'Dispõe sobre saúde' }),
        joinRow({
          externalIdProposicao: 2,
          ementa: 'Dispõe sobre educação',
          externalIdVotacao: '2-1',
        }),
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the query matches computavel proposicoes', () => {
    it('returns a valid contract and echoes the query', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/search')
        .query({ q: 'saúde' });

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesSearchResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.query).toBe('saúde');
      expect(
        body.items.map(
          (item: { externalIdProposicao: number }) => item.externalIdProposicao,
        ),
      ).toEqual([1]);
    });

    it('caps limit at 100 and honours the offset query param', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/search')
        .query({ q: 'dispõe', limit: 999, offset: 1 });

      // Assert
      const body = proposicoesSearchResponseSchema.parse(
        response.body as unknown,
      );
      expect(body.limit).toBe(100);
      expect(body.offset).toBe(1);
    });
  });

  describe('when the query is empty or only separators', () => {
    it.each([
      ['missing q', undefined],
      ['blank q', '   '],
      ['separator only', '/'],
    ])('rejects %s with 400', async (_label, q) => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/search')
        .query(q === undefined ? {} : { q });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when the query is valid but matches nothing', () => {
    it('returns an empty page, not an error', async () => {
      // Act
      const response = await request(getTestServer(app))
        .get('/proposicoes/search')
        .query({ q: 'zzz' });

      // Assert
      expect(response.status).toBe(200);
      const body = proposicoesSearchResponseSchema.parse(
        response.body as unknown,
      );
      expect(body).toMatchObject({
        items: [],
        total: 0,
        query: 'zzz',
      });
    });
  });
});

describe('GET /proposicoes/:externalIdProposicao', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp({
      detalhe: new Map([
        [
          1,
          {
            proposicao: detalheHead(),
            votacoes: [votacaoDetalheRow()],
            temas: [],
          },
        ],
      ]),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the proposicao exists and is computavel', () => {
    it('returns a valid detalhe contract with temas as an empty list', async () => {
      // Act
      const response = await request(getTestServer(app)).get('/proposicoes/1');

      // Assert
      expect(response.status).toBe(200);
      const body = proposicaoDetalheSchema.parse(response.body as unknown);
      expect(body.temas).toEqual([]);
      expect(body).not.toHaveProperty('id');
    });
  });

  describe('when the externalId is not a public proposicao identity', () => {
    it('returns 404 for a numeric id that does not exist', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/999',
      );

      // Assert
      expect(response.status).toBe(404);
    });

    it('rejects a non-numeric id with 400', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/abc',
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('rejects an internal UUID with 400 instead of treating it as identity', async () => {
      // Act
      const response = await request(getTestServer(app)).get(
        '/proposicoes/550e8400-e29b-41d4-a716-446655440000',
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('route precedence', () => {
    it.each(['/proposicoes/feed', '/proposicoes/search'])(
      'does not let the :externalIdProposicao route swallow %s',
      async (path) => {
        // Act
        const response = await request(getTestServer(app))
          .get(path)
          .query(path.endsWith('search') ? { q: 'saúde' } : {});

        // Assert: a list/search payload, never a single detalhe
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
      },
    );
  });
});
