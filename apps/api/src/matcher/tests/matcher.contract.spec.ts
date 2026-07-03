import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  matcherDeputadoDetalheSchema,
  matcherExecucaoResumoSchema,
  matcherResultadoSchema,
  type PosicaoMatcher,
} from '@vota-comigo/shared-types';
import request from 'supertest';

import { MatcherController } from '../matcher.controller';
import { MATCHER_REPOSITORY } from '../matcher.repository';
import type { MatcherRepository } from '../matcher.repository';
import { MatcherService } from '../matcher.service';
import type {
  DeputadoCompatibilidadeInput,
  VotacaoReferenciaVotos,
} from '../types/compatibilidade.types';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

function posicao(overrides: Partial<PosicaoMatcher> = {}): PosicaoMatcher {
  return {
    externalIdProposicao: 1,
    posicao: 'aprovar',
    ...overrides,
  };
}

function deputadoInput(
  overrides: Partial<DeputadoCompatibilidadeInput> = {},
): DeputadoCompatibilidadeInput {
  return {
    deputadoId: 'dep-1',
    externalIdDeputado: 100,
    nome: 'Fulano',
    nomeEleitoral: null,
    nomeCivil: null,
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: null,
    intervalos: [{ openedAt: '2023-02-01T12:00:00Z', closedAt: null }],
    ...overrides,
  };
}

function expectSerializedBodyNotToContain(
  body: unknown,
  forbiddenTokens: readonly string[],
): void {
  const serialized = JSON.stringify(body);
  for (const token of forbiddenTokens) {
    expect(serialized).not.toContain(token);
  }
}

function fakeRepository(
  externalIdProposicoesComputaveis: ReadonlySet<number>,
  deputadoResult?: DeputadoCompatibilidadeInput | null,
  deputadosResult: readonly DeputadoCompatibilidadeInput[] = [],
): MatcherRepository {
  const votacoes: VotacaoReferenciaVotos[] = [
    {
      externalIdProposicao: 1,
      proposicao: {
        externalIdProposicao: 1,
        siglaTipo: 'PL',
        numero: 1,
        ano: 2024,
        ementa: 'Proposição de teste',
        resumoIaDisponivel: false,
        resumoIaCard: null,
        dataApresentacao: '2023-12-01T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-01-01',
      },
      votacaoReferencia: {
        dataHoraRegistro: '2024-01-01T12:00:00Z',
        data: '2024-01-01',
      },
      votacaoReferenciaResumo: {
        externalIdVotacao: '1',
        data: '2024-01-01',
        descricao: 'Aprovado o projeto de lei',
        pattern: 'projeto_de_lei',
        votosSim: 1,
        votosNao: 0,
        votosOutros: 0,
        resultado: 'aprovada',
      },
      votosByDeputado: new Map([['dep-1', 'sim']]),
    },
    {
      externalIdProposicao: 2,
      proposicao: {
        externalIdProposicao: 2,
        siglaTipo: 'PL',
        numero: 2,
        ano: 2024,
        ementa: 'Proposição de teste',
        resumoIaDisponivel: false,
        resumoIaCard: null,
        dataApresentacao: '2023-12-01T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-01-01',
      },
      votacaoReferencia: {
        dataHoraRegistro: '2024-01-01T12:00:00Z',
        data: '2024-01-01',
      },
      votacaoReferenciaResumo: {
        externalIdVotacao: '2',
        data: '2024-01-01',
        descricao: 'Aprovado o projeto de lei',
        pattern: 'projeto_de_lei',
        votosSim: 0,
        votosNao: 1,
        votosOutros: 0,
        resultado: 'rejeitada',
      },
      votosByDeputado: new Map([['dep-1', 'nao']]),
    },
    {
      externalIdProposicao: 3,
      proposicao: {
        externalIdProposicao: 3,
        siglaTipo: 'PL',
        numero: 3,
        ano: 2024,
        ementa: 'Proposição de teste',
        resumoIaDisponivel: false,
        resumoIaCard: null,
        dataApresentacao: '2023-12-01T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-01-01',
      },
      votacaoReferencia: {
        dataHoraRegistro: '2024-01-01T12:00:00Z',
        data: '2024-01-01',
      },
      votacaoReferenciaResumo: {
        externalIdVotacao: '3',
        data: '2024-01-01',
        descricao: 'Aprovado o projeto de lei',
        pattern: 'projeto_de_lei',
        votosSim: 1,
        votosNao: 0,
        votosOutros: 0,
        resultado: 'aprovada',
      },
      votosByDeputado: new Map([['dep-1', 'sim']]),
    },
  ];
  const deputado = deputadoInput();

  return {
    loadExternalIdProposicoesComputaveis: async () =>
      externalIdProposicoesComputaveis,
    loadVotacoesReferenciaWithVotos: async () => votacoes,
    loadDeputadosByEscopoWithHistorico: async () => deputadosResult,
    loadDeputadoByExternalIdWithHistorico: async () =>
      deputadoResult === undefined ? deputado : deputadoResult,
  };
}

async function buildApp(
  externalIdProposicoesComputaveis: ReadonlySet<number>,
  deputadoResult?: DeputadoCompatibilidadeInput | null,
  deputadosResult: readonly DeputadoCompatibilidadeInput[] = [],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [MatcherController],
    providers: [
      MatcherService,
      {
        provide: MATCHER_REPOSITORY,
        useValue: fakeRepository(
          externalIdProposicoesComputaveis,
          deputadoResult,
          deputadosResult,
        ),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('POST /matcher', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Set([1, 2, 3, 4, 5]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the execution is valid', () => {
    it('returns 200 with a normalized execution summary contract', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          cidade: 'Recife',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherExecucaoResumoSchema.parse(response.body as unknown);
      expect(body).toMatchObject({
        siglaUf: 'PE',
        cidade: 'Recife',
        totalProposicoesSelecionadas: 3,
        totalPosicoesComputaveis: 3,
      });
    });

    it('returns 200 with the estadual result contract', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          cidade: 'Recife',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherResultadoSchema.parse(response.body as unknown);
      expect(body).toMatchObject({
        escopo: 'estadual',
        deputados: [],
        totalDeputadosAvaliados: 0,
        deputadosHistoricoIncompleto: 0,
      });
    });

    it('echoes the nacional escopo sent in the body', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          escopo: 'nacional',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherResultadoSchema.parse(response.body as unknown);
      expect(body.escopo).toBe('nacional');
    });

    it('defaults the escopo to estadual when the field is absent', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherResultadoSchema.parse(response.body as unknown);
      expect(body.escopo).toBe('estadual');
    });

    it('keeps ranking deputados as lean summaries without vote-by-vote detail', async () => {
      // Arrange
      const appWithRanking = await buildApp(new Set([1, 2, 3]), undefined, [
        deputadoInput(),
      ]);

      try {
        // Act
        const response = await request(getTestServer(appWithRanking))
          .post('/matcher')
          .send({
            siglaUf: 'PE',
            cidade: 'Recife',
            posicoes: [
              posicao({ externalIdProposicao: 1 }),
              posicao({
                externalIdProposicao: 2,
                posicao: 'rejeitar',
              }),
              posicao({ externalIdProposicao: 3 }),
            ],
          });

        // Assert
        expect(response.status).toBe(200);
        const body = matcherResultadoSchema.parse(response.body as unknown);
        expect(body.deputados).toHaveLength(1);
        expect(body.deputados[0]).toMatchObject({
          externalIdDeputado: 100,
          nome: 'Fulano',
          siglaUf: 'PE',
          compatibilidadeBruta: 100,
          amostraComparavel: 3,
        });
        expect(body.deputados[0]).not.toHaveProperty('votos');
        expect(body.deputados[0]).not.toHaveProperty('metrics');
        expect(body.deputados[0]).not.toHaveProperty('posicaoUsuario');
        expect(body.deputados[0]).not.toHaveProperty('votacaoReferencia');
        expect(body.deputados[0]).not.toHaveProperty('situacaoDeputadoVotacao');
        expect(body.deputados[0]).not.toHaveProperty('matcherEffect');
        expectSerializedBodyNotToContain(response.body, [
          'votos',
          'metrics',
          'posicaoUsuario',
          'votacaoReferencia',
          'situacaoDeputadoVotacao',
          'matcherEffect',
          'resultadoId',
          'token',
          'session',
          'cache',
          'orientacao',
          'bancada',
          'shared',
          'link',
        ]);
      } finally {
        await appWithRanking.close();
      }
    });

    it('rejects the nacional escopo without a UF, since UF stays required', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          escopo: 'nacional',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('coalesces a missing cidade to null', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherExecucaoResumoSchema.parse(response.body as unknown);
      expect(body.cidade).toBeNull();
    });

    it('accepts up to thirty selected proposicoes, counting nao_sei', async () => {
      // Arrange: 3 computaveis + 27 nao_sei = 30 selected
      const posicoes = [
        posicao({ externalIdProposicao: 1 }),
        posicao({
          externalIdProposicao: 2,
          posicao: 'rejeitar',
        }),
        posicao({ externalIdProposicao: 3 }),
        ...Array.from({ length: 27 }, (_unused, index) =>
          posicao({ externalIdProposicao: 100 + index, posicao: 'nao_sei' }),
        ),
      ];

      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({ siglaUf: 'PE', posicoes });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherExecucaoResumoSchema.parse(response.body as unknown);
      expect(body.totalProposicoesSelecionadas).toBe(30);
      expect(body.totalPosicoesComputaveis).toBe(3);
    });
  });

  describe('when paginating through the query string', () => {
    function validBody() {
      return {
        siglaUf: 'PE',
        posicoes: [
          posicao({ externalIdProposicao: 1 }),
          posicao({ externalIdProposicao: 2, posicao: 'rejeitar' }),
          posicao({ externalIdProposicao: 3 }),
        ],
      };
    }

    it('defaults limit to 20 and offset to 0 when absent', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send(validBody());

      // Assert
      expect(response.status).toBe(200);
      const body = matcherResultadoSchema.parse(response.body as unknown);
      expect(body.limit).toBe(20);
      expect(body.offset).toBe(0);
    });

    it('caps the limit at 100 and keeps the offset from the query', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .query({ limit: 999, offset: 5 })
        .send(validBody());

      // Assert
      expect(response.status).toBe(200);
      const body = matcherResultadoSchema.parse(response.body as unknown);
      expect(body.limit).toBe(100);
      expect(body.offset).toBe(5);
    });
  });

  describe('when positions are sent as query string instead of body', () => {
    it('rejects with 400 because positions must travel in the body', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .query({ siglaUf: 'PE' })
        .send();

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when posicoes is a map keyed by id instead of a list', () => {
    it('rejects with 400', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: { '1': { posicao: 'aprovar' } },
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when siglaUf is invalid or missing', () => {
    it('rejects an unknown UF with 400', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'XX',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('rejects a missing UF with 400', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when a proposicao is duplicated', () => {
    it('rejects with 400 and names the duplicate', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 1,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain('duplicada');
    });
  });

  describe('when more than thirty proposicoes are selected', () => {
    it('rejects with 400', async () => {
      // Arrange
      const posicoes = Array.from({ length: 31 }, (_unused, index) =>
        posicao({ externalIdProposicao: index + 1 }),
      );

      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({ siglaUf: 'PE', posicoes });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when fewer than three computavel positions are sent', () => {
    it('rejects with 400, ignoring nao_sei for the minimum', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 3, posicao: 'nao_sei' }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('when a computavel position is not computavel pelo matcher', () => {
    it('rejects with 400 naming the offending proposicao', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({
              externalIdProposicao: 2,
              posicao: 'rejeitar',
            }),
            posicao({ externalIdProposicao: 99 }),
          ],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain('99');
    });
  });
});

describe('POST /matcher/deputados/:externalIdDeputado', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Set([1, 2, 3, 4, 5]));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the execution is valid', () => {
    it('returns 200 with the deputado detail contract', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/matcher/deputados/100')
        .send({
          siglaUf: 'PE',
          cidade: 'Recife',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({ externalIdProposicao: 2, posicao: 'rejeitar' }),
            posicao({ externalIdProposicao: 3 }),
            posicao({ externalIdProposicao: 4, posicao: 'nao_sei' }),
          ],
        });

      // Assert
      expect(response.status).toBe(200);
      const body = matcherDeputadoDetalheSchema.parse(response.body as unknown);
      expect(body).toMatchObject({
        siglaUf: 'PE',
        cidade: 'Recife',
        totalProposicoesSelecionadas: 4,
        totalPosicoesComputaveis: 3,
        deputado: {
          externalIdDeputado: 100,
          nome: 'Fulano',
        },
        metrics: {
          totalConcordancias: 3,
          totalDiscordancias: 0,
          totalForaDoDenominador: 0,
          amostraComparavel: 3,
        },
      });
      expect(body.votos).toHaveLength(3);
      expect(
        body.votos.map((voto) => voto.proposicao.externalIdProposicao),
      ).not.toContain(4);
      expectSerializedBodyNotToContain(response.body, [
        'resultadoId',
        'token',
        'session',
        'cache',
        'coleta',
        'cookie',
        'orientacao',
        'bancada',
        'shared',
        'link',
      ]);
    });
  });

  describe('when the deputado is not available in the requested scope', () => {
    let appWithoutDeputado: INestApplication;

    beforeAll(async () => {
      appWithoutDeputado = await buildApp(new Set([1, 2, 3]), null);
    });

    afterAll(async () => {
      await appWithoutDeputado.close();
    });

    it('returns 404', async () => {
      // Act
      const response = await request(getTestServer(appWithoutDeputado))
        .post('/matcher/deputados/999')
        .send({
          siglaUf: 'PE',
          posicoes: [
            posicao({ externalIdProposicao: 1 }),
            posicao({ externalIdProposicao: 2, posicao: 'rejeitar' }),
            posicao({ externalIdProposicao: 3 }),
          ],
        });

      // Assert
      expect(response.status).toBe(404);
    });
  });
});

describe('GET matcher suggestion routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp(new Set([1, 2, 3, 4, 5]));
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/matcher/sugestoes', '/matcher/suggestions'])(
    'does not expose %s as a public matcher endpoint',
    async (path) => {
      // Act
      const response = await request(getTestServer(app)).get(path);

      // Assert
      expect(response.status).toBe(404);
    },
  );
});
