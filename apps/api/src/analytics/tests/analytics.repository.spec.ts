import type { DrizzleDatabase } from '@/shared/database/client';
import { matcherCompletion } from '@/shared/database/schema';

import { createAnalyticsRepository } from '../analytics.repository';

describe('createAnalyticsRepository', () => {
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
      });

      // Assert
      expect(insert).toHaveBeenCalledWith(matcherCompletion);
      expect(values).toHaveBeenCalledWith({
        totalSelecionadas: 7,
        totalRespondidas: 5,
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
      });

      // Assert
      const [firstCall] = values.mock.calls as [unknown][];
      const inserted = firstCall[0] as Record<string, unknown>;
      expect(Object.keys(inserted).sort()).toEqual([
        'totalRespondidas',
        'totalSelecionadas',
      ]);
    });
  });
});
