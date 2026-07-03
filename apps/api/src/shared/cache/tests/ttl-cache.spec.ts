import { createTtlCache } from '../ttl-cache';

describe('createTtlCache', () => {
  describe('when reading a key', () => {
    it('returns undefined for a key that was never set', () => {
      // Arrange
      const cache = createTtlCache<number>({ ttlMs: 1_000, maxEntries: 10 });

      // Act
      const value = cache.get('missing');

      // Assert
      expect(value).toBeUndefined();
    });

    it('returns the stored value while still within the ttl', () => {
      // Arrange
      let now = 0;
      const cache = createTtlCache<number>({
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => now,
      });
      cache.set('a', 42);

      // Act
      now = 999;
      const value = cache.get('a');

      // Assert
      expect(value).toBe(42);
    });
  });

  describe('when an entry expires', () => {
    it('returns undefined once the ttl has elapsed', () => {
      // Arrange
      let now = 0;
      const cache = createTtlCache<number>({
        ttlMs: 1_000,
        maxEntries: 10,
        clock: () => now,
      });
      cache.set('a', 42);

      // Act
      now = 1_000;
      const value = cache.get('a');

      // Assert
      expect(value).toBeUndefined();
    });
  });

  describe('when exceeding the entry limit', () => {
    it('evicts the oldest entry', () => {
      // Arrange
      const cache = createTtlCache<string>({ ttlMs: 10_000, maxEntries: 2 });

      // Act
      cache.set('a', 'first');
      cache.set('b', 'second');
      cache.set('c', 'third');

      // Assert
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('second');
      expect(cache.get('c')).toBe('third');
    });
  });

  describe('when using distinct keys', () => {
    it('keeps values isolated per key', () => {
      // Arrange
      const cache = createTtlCache<number>({ ttlMs: 1_000, maxEntries: 10 });

      // Act
      cache.set('a', 1);
      cache.set('b', 2);

      // Assert
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });
  });
});
