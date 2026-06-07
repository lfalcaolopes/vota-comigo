import { normalizePagination } from './mais-votadas-query.dto';

describe('normalizePagination', () => {
  describe('defaults', () => {
    it('uses limit 20 and offset 0 when values are missing', () => {
      // Act
      const pagination = normalizePagination(undefined, undefined);

      // Assert
      expect(pagination).toEqual({ limit: 20, offset: 0 });
    });
  });

  describe('limit bounds', () => {
    it('caps limit at 100', () => {
      // Act / Assert
      expect(normalizePagination(999, 0).limit).toBe(100);
    });

    it('raises limit to at least 1', () => {
      // Act / Assert
      expect(normalizePagination(0, 0).limit).toBe(1);
    });

    it('keeps a valid limit', () => {
      // Act / Assert
      expect(normalizePagination(50, 0).limit).toBe(50);
    });
  });

  describe('offset bounds', () => {
    it('floors negative offset to 0', () => {
      // Act / Assert
      expect(normalizePagination(20, -5).offset).toBe(0);
    });

    it('keeps a valid offset', () => {
      // Act / Assert
      expect(normalizePagination(20, 40).offset).toBe(40);
    });
  });
});
