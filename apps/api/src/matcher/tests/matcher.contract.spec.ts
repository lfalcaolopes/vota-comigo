import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  matcherExecucaoResumoSchema,
  matcherResultadoSchema,
  type PosicaoMatcher,
} from '@vota-comigo/shared-types';
import request from 'supertest';

import { MatcherController } from '../matcher.controller';
import { MATCHER_REPOSITORY } from '../matcher.repository';
import type { MatcherRepository } from '../matcher.repository';
import { MatcherService } from '../matcher.service';

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

function fakeRepository(
  externalIdProposicoesComputaveis: ReadonlySet<number>,
): MatcherRepository {
  return {
    loadExternalIdProposicoesComputaveis: async () =>
      externalIdProposicoesComputaveis,
    loadVotacoesReferenciaWithVotos: async () => [],
    loadDeputadosByEscopoWithHistorico: async () => [],
  };
}

async function buildApp(
  externalIdProposicoesComputaveis: ReadonlySet<number>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [MatcherController],
    providers: [
      MatcherService,
      {
        provide: MATCHER_REPOSITORY,
        useValue: fakeRepository(externalIdProposicoesComputaveis),
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
