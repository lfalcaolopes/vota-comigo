import { wilsonLowerBound } from '../rules/wilson';

describe('wilsonLowerBound', () => {
  describe('when the sample is fully concordant', () => {
    it('scores a large 100% sample higher than a small 100% sample', () => {
      // Act
      const grande = wilsonLowerBound(10, 10);
      const pequeno = wilsonLowerBound(2, 2);

      // Assert
      expect(grande).toBeCloseTo(0.7225, 3);
      expect(pequeno).toBeCloseTo(0.3424, 3);
      expect(grande).toBeGreaterThan(pequeno);
    });
  });

  describe('when there are no agreements', () => {
    it('returns 0 for any positive sample', () => {
      // Act / Assert
      expect(wilsonLowerBound(0, 5)).toBe(0);
      expect(wilsonLowerBound(0, 100)).toBe(0);
    });
  });

  describe('when the sample is empty', () => {
    it('returns 0', () => {
      // Act / Assert
      expect(wilsonLowerBound(0, 0)).toBe(0);
    });
  });

  describe('when more agreements accumulate at the same total', () => {
    it('increases monotonically with the number of agreements', () => {
      // Act
      const scores = [0, 1, 2, 3, 4, 5].map((sucessos) =>
        wilsonLowerBound(sucessos, 5),
      );

      // Assert
      for (let i = 1; i < scores.length; i += 1) {
        expect(scores[i]).toBeGreaterThan(scores[i - 1]);
      }
    });
  });
});
