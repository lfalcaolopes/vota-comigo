import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  matcherCompletionEventSchema,
  matcherStartEventSchema,
} from '@vota-comigo/shared-types';
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
      expect(result.data).toEqual({
        totalSelecionadas: 5,
        totalRespondidas: 3,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });
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

describe('matcherStartEventSchema', () => {
  describe('when validating attribution', () => {
    it('accepts nullable attribution fields', () => {
      // Act
      const result = matcherStartEventSchema.safeParse({
        utmSource: 'whatsapp',
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });
});

describe('POST /analytics/matcher-start', () => {
  let app: INestApplication;
  let recordMatcherStart: jest.Mock;

  beforeEach(async () => {
    recordMatcherStart = jest.fn().mockResolvedValue(undefined);
    app = await buildApp({
      recordMatcherStart,
      recordMatcherCompletion: jest.fn(),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('when the body is valid', () => {
    it('returns 204 and records the start', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/analytics/matcher-start')
        .send({ utmSource: 'whatsapp', utmMedium: 'social' });

      // Assert
      expect(response.status).toBe(204);
      expect(recordMatcherStart).toHaveBeenCalledWith({
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });
    });
  });
});

describe('POST /analytics/matcher-completion', () => {
  let app: INestApplication;
  let recordMatcherCompletion: jest.Mock;

  beforeEach(async () => {
    recordMatcherCompletion = jest.fn().mockResolvedValue(undefined);
    app = await buildApp({
      recordMatcherStart: jest.fn(),
      recordMatcherCompletion,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('when the body is valid', () => {
    it('returns 204 and records the completion', async () => {
      // Act
      const response = await request(getTestServer(app))
        .post('/analytics/matcher-completion')
        .send({
          totalSelecionadas: 6,
          totalRespondidas: 4,
          utmSource: 'whatsapp',
          utmMedium: 'social',
          utmCampaign: null,
          utmContent: null,
          referrer: 'https://example.com/origem',
        });

      // Assert
      expect(response.status).toBe(204);
      expect(recordMatcherCompletion).toHaveBeenCalledWith({
        totalSelecionadas: 6,
        totalRespondidas: 4,
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: null,
        utmContent: null,
        referrer: 'https://example.com/origem',
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
