import { mapWithConcurrency } from '../bounded-concurrency';

describe('mapWithConcurrency', () => {
  describe('when mapping a list of items', () => {
    it('returns the results in input order', async () => {
      // Arrange
      const items = [1, 2, 3, 4, 5];

      // Act
      const results = await mapWithConcurrency(items, 2, (n) =>
        Promise.resolve(n * 2),
      );

      // Assert
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('preserves input order even when workers settle out of order', async () => {
      // Arrange
      const items = [30, 5, 15];

      // Act
      const results = await mapWithConcurrency(
        items,
        3,
        (delay) =>
          new Promise<number>((resolve) =>
            setTimeout(() => resolve(delay), delay),
          ),
      );

      // Assert
      expect(results).toEqual([30, 5, 15]);
    });
  });

  describe('when there are more items than the concurrency limit', () => {
    it('never runs more than `limit` workers at the same time', async () => {
      // Arrange
      const items = [1, 2, 3, 4, 5, 6];
      let active = 0;
      let maxActive = 0;
      const worker = async (n: number): Promise<number> => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return n;
      };

      // Act
      const results = await mapWithConcurrency(items, 2, worker);

      // Assert
      expect(results).toEqual(items);
      expect(maxActive).toBe(2);
    });
  });

  describe('when the input is empty', () => {
    it('resolves to an empty array without invoking the worker', async () => {
      // Arrange
      const worker = jest.fn();

      // Act
      const results = await mapWithConcurrency([], 3, worker);

      // Assert
      expect(results).toEqual([]);
      expect(worker).not.toHaveBeenCalled();
    });
  });
});
