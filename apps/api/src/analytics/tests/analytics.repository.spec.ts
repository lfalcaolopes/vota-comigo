import type { DrizzleDatabase } from '@/shared/database/client';
import { matcherCompletion, matcherStart } from '@/shared/database/schema';

import { createAnalyticsRepository } from '../analytics.repository';

describe('createAnalyticsRepository', () => {
  describe('when recording a matcher start', () => {
    it('inserts an attribution row into matcher_start', async () => {
      // Arrange
      const values = jest.fn().mockResolvedValue(undefined);
      const insert = jest.fn().mockReturnValue({ values });
      const db = { insert } as unknown as DrizzleDatabase;
      const repository = createAnalyticsRepository(db);

      // Act
      await repository.recordMatcherStart({
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: 'eleicoes',
        utmContent: null,
        referrer: 'https://example.com/origem',
      });

      // Assert
      expect(insert).toHaveBeenCalledWith(matcherStart);
      expect(values).toHaveBeenCalledWith({
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: 'eleicoes',
        utmContent: null,
        referrer: 'https://example.com/origem',
      });
    });
  });

  describe('when recording a matcher completion', () => {
    it('inserts an aggregate-count row into matcher_completion', async () => {
      // Arrange
      const values = jest.fn().mockResolvedValue(undefined);
      const insert = jest.fn().mockReturnValue({ values });
      const db = { insert } as unknown as DrizzleDatabase;
      const repository = createAnalyticsRepository(db);

      // Act
      await repository.recordMatcherCompletion({
        totalSelecionadas: 7,
        totalRespondidas: 5,
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: null,
        utmContent: null,
        referrer: 'https://example.com/origem',
      });

      // Assert
      expect(insert).toHaveBeenCalledWith(matcherCompletion);
      expect(values).toHaveBeenCalledWith({
        totalSelecionadas: 7,
        totalRespondidas: 5,
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: null,
        utmContent: null,
        referrer: 'https://example.com/origem',
      });
    });

    it('persists no client-supplied identifier or timestamp', async () => {
      // Arrange
      const values = jest.fn().mockResolvedValue(undefined);
      const insert = jest.fn().mockReturnValue({ values });
      const db = { insert } as unknown as DrizzleDatabase;
      const repository = createAnalyticsRepository(db);

      // Act
      await repository.recordMatcherCompletion({
        totalSelecionadas: 3,
        totalRespondidas: 3,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });

      // Assert
      const [firstCall] = values.mock.calls as [unknown][];
      const inserted = firstCall[0] as Record<string, unknown>;
      expect(Object.keys(inserted).sort()).toEqual([
        'referrer',
        'totalRespondidas',
        'totalSelecionadas',
        'utmCampaign',
        'utmContent',
        'utmMedium',
        'utmSource',
      ]);
    });
  });
});
