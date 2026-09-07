import type { AnalyticsRepository } from '../analytics.repository';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  describe('when recording a matcher start', () => {
    it('delegates the event to the repository', async () => {
      // Arrange
      const recordMatcherStart = jest.fn().mockResolvedValue(undefined);
      const repository: AnalyticsRepository = {
        recordMatcherStart,
        recordMatcherCompletion: jest.fn(),
      };
      const service = new AnalyticsService(repository);
      const event = {
        utmSource: 'whatsapp',
        utmMedium: 'social',
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      };

      // Act
      await service.recordMatcherStart(event);

      // Assert
      expect(recordMatcherStart).toHaveBeenCalledWith(event);
    });
  });

  describe('when recording a matcher completion', () => {
    it('delegates the event to the repository', async () => {
      // Arrange
      const recordMatcherCompletion = jest.fn().mockResolvedValue(undefined);
      const repository: AnalyticsRepository = {
        recordMatcherStart: jest.fn(),
        recordMatcherCompletion,
      };
      const service = new AnalyticsService(repository);
      const event = {
        totalSelecionadas: 4,
        totalRespondidas: 2,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      };

      // Act
      await service.recordMatcherCompletion(event);

      // Assert
      expect(recordMatcherCompletion).toHaveBeenCalledWith(event);
    });
  });
});
