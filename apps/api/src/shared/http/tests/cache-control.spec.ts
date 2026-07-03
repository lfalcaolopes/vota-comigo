import {
  buildCacheControlHeader,
  CACHE_LISTING,
  CACHE_REFERENCE,
} from '../cache-control';

describe('buildCacheControlHeader', () => {
  describe('when building the visibility directive', () => {
    it('marks the response public by default', () => {
      // Arrange & Act
      const header = buildCacheControlHeader({ sMaxAge: 60 });

      // Assert
      expect(header).toContain('public');
      expect(header).not.toContain('private');
    });

    it('marks the response private when public is false', () => {
      // Arrange & Act
      const header = buildCacheControlHeader({ public: false, sMaxAge: 60 });

      // Assert
      expect(header).toContain('private');
      expect(header).not.toContain('public');
    });
  });

  describe('when combining lifetime directives', () => {
    it('emits each provided directive in a single header value', () => {
      // Arrange & Act
      const header = buildCacheControlHeader({
        public: true,
        maxAge: 0,
        sMaxAge: 300,
        staleWhileRevalidate: 3_600,
      });

      // Assert
      expect(header).toBe(
        'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      );
    });

    it('omits directives that were not provided', () => {
      // Arrange & Act
      const header = buildCacheControlHeader({ sMaxAge: 300 });

      // Assert
      expect(header).toBe('public, s-maxage=300');
      expect(header).not.toContain('max-age=');
      expect(header).not.toContain('stale-while-revalidate');
    });
  });

  describe('when using the shared profiles', () => {
    it('gives reference data a longer shared-cache window than listings', () => {
      // Arrange & Act
      const reference = CACHE_REFERENCE.sMaxAge ?? 0;
      const listing = CACHE_LISTING.sMaxAge ?? 0;

      // Assert
      expect(reference).toBeGreaterThan(listing);
    });
  });
});
