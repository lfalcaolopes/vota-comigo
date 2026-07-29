import type { AnalyticsRepository } from '../analytics.repository';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  describe('when recording a matcher completion', () => {
    it('delegates the event to the repository', async () => {
      // Arrange
      const recordMatcherCompletion = jest.fn().mockResolvedValue(undefined);
      const repository: AnalyticsRepository = { recordMatcherCompletion };
      const service = new AnalyticsService(repository);
      const event = { totalSelecionadas: 4, totalRespondidas: 2 };

      // Act
      await service.recordMatcherCompletion(event);

      // Assert
      expect(recordMatcherCompletion).toHaveBeenCalledWith(event);
    });
  });
});
