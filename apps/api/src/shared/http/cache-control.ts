export type CacheControlDirectives = {
  readonly public?: boolean;
  readonly maxAge?: number;
  readonly sMaxAge?: number;
  readonly staleWhileRevalidate?: number;
};

export function buildCacheControlHeader(
  directives: CacheControlDirectives,
): string {
  const parts: string[] = [directives.public === false ? 'private' : 'public'];

  if (directives.maxAge !== undefined) {
    parts.push(`max-age=${directives.maxAge}`);
  }
  if (directives.sMaxAge !== undefined) {
    parts.push(`s-maxage=${directives.sMaxAge}`);
  }
  if (directives.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${directives.staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

// Enumeration/dimension endpoints (temas, ufs, partidos) change only on
// ingestion, so they tolerate a long shared-cache window.
export const CACHE_REFERENCE: CacheControlDirectives = {
  public: true,
  maxAge: 60,
  sMaxAge: 3_600,
  staleWhileRevalidate: 86_400,
};

// Feeds and detail responses are also static between ingestions but are keyed
// by query params; a shorter shared-cache window bounds staleness per variant.
export const CACHE_LISTING: CacheControlDirectives = {
  public: true,
  maxAge: 0,
  sMaxAge: 300,
  staleWhileRevalidate: 3_600,
};
