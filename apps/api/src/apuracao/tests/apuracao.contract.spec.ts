import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ApuracaoController } from '../apuracao.controller';
import { APURACAO_REPOSITORY } from '../apuracao.repository';
import { ApuracaoService } from '../apuracao.service';

type TestServer = Parameters<typeof request>[0];

const TOKEN = 'a'.repeat(40);

const validSnapshot = {
  externalCdEleicao: '6258',
  urnasStep: 10,
  urnasApuradas: 10.42,
  numeroA: '13',
  numeroB: '22',
  oficialShareA: 0.531,
  projecaoShareA: 0.512,
  tseUpdatedAt: '25/10/2026 19:40:12',
  source: 'site',
};

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

async function buildApp(
  recordSnapshot: jest.Mock,
  configuredToken: string | null = TOKEN,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ApuracaoController],
    providers: [
      ApuracaoService,
      { provide: APURACAO_REPOSITORY, useValue: { recordSnapshot } },
      {
        provide: ConfigService,
        useValue: { get: () => configuredToken ?? undefined },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('POST /apuracao/snapshots', () => {
  let app: INestApplication;
  let recordSnapshot: jest.Mock;

  afterEach(async () => {
    await app.close();
  });

  describe('when the site sends the shared token', () => {
    beforeEach(async () => {
      recordSnapshot = jest.fn().mockResolvedValue(true);
      app = await buildApp(recordSnapshot);
    });

    it('records the snapshot for that step', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .set('x-apuracao-token', TOKEN)
        .send(validSnapshot);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ saved: true });
      expect(recordSnapshot).toHaveBeenCalledWith(validSnapshot);
    });

    it('rejects a step that is not a multiple of 5', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .set('x-apuracao-token', TOKEN)
        .send({ ...validSnapshot, urnasStep: 7 });

      // Assert
      expect(response.status).toBe(400);
      expect(recordSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('when the step was already saved', () => {
    beforeEach(async () => {
      recordSnapshot = jest.fn().mockResolvedValue(false);
      app = await buildApp(recordSnapshot);
    });

    it('answers that nothing new was saved', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .set('x-apuracao-token', TOKEN)
        .send(validSnapshot);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ saved: false });
    });
  });

  describe('when the token is missing or wrong', () => {
    beforeEach(async () => {
      recordSnapshot = jest.fn();
      app = await buildApp(recordSnapshot);
    });

    it('refuses a request without the token', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .send(validSnapshot);

      // Assert
      expect(response.status).toBe(401);
      expect(recordSnapshot).not.toHaveBeenCalled();
    });

    it('refuses a request with a different token', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .set('x-apuracao-token', 'b'.repeat(40))
        .send(validSnapshot);

      // Assert
      expect(response.status).toBe(401);
      expect(recordSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('when the API has no token configured', () => {
    beforeEach(async () => {
      recordSnapshot = jest.fn();
      app = await buildApp(recordSnapshot, null);
    });

    it('refuses every request', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/apuracao/snapshots')
        .set('x-apuracao-token', TOKEN)
        .send(validSnapshot);

      // Assert
      expect(response.status).toBe(401);
      expect(recordSnapshot).not.toHaveBeenCalled();
    });
  });
});
