import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { matcherCompletionEventSchema } from '@vota-comigo/shared-types';
import request from 'supertest';

import { AnalyticsController } from '../analytics.controller';
import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepository,
} from '../analytics.repository';
import { AnalyticsService } from '../analytics.service';

type TestServer = Parameters<typeof request>[0];

function getTestServer(app: INestApplication): TestServer {
  const server: unknown = app.getHttpServer();
  return server as TestServer;
}

async function buildApp(
  repository: AnalyticsRepository,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [AnalyticsController],
    providers: [
      AnalyticsService,
      { provide: ANALYTICS_REPOSITORY, useValue: repository },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('matcherCompletionEventSchema', () => {
  describe('when validating aggregate completion counts', () => {
    it('accepts a valid event', () => {
      // Act
      const result = matcherCompletionEventSchema.safeParse({
        totalSelecionadas: 5,
        totalRespondidas: 3,
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('rejects negative counts', () => {
      // Act
      const result = matcherCompletionEventSchema.safeParse({
        totalSelecionadas: -1,
        totalRespondidas: 0,
      });

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects non-integer counts', () => {
      // Act
      const result = matcherCompletionEventSchema.safeParse({
        totalSelecionadas: 2.5,
        totalRespondidas: 1,
      });

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

describe('POST /analytics/matcher-completion', () => {
  let app: INestApplication;
  let recordMatcherCompletion: jest.Mock;

  beforeEach(async () => {
    recordMatcherCompletion = jest.fn().mockResolvedValue(undefined);
    app = await buildApp({ recordMatcherCompletion });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('when the body is valid', () => {
    it('returns 204 and records the completion', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/analytics/matcher-completion')
        .send({ totalSelecionadas: 6, totalRespondidas: 4 });

      // Assert
      expect(response.status).toBe(204);
      expect(recordMatcherCompletion).toHaveBeenCalledWith({
        totalSelecionadas: 6,
        totalRespondidas: 4,
      });
    });
  });

  describe('when the body is invalid', () => {
    it('rejects a negative count with 400 without recording', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/analytics/matcher-completion')
        .send({ totalSelecionadas: -3, totalRespondidas: 0 });

      // Assert
      expect(response.status).toBe(400);
      expect(recordMatcherCompletion).not.toHaveBeenCalled();
    });
  });
});
