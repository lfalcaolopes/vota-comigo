export function parseRedesSociais(urlRedeSocial: string | null): string[] {
  if (!urlRedeSocial?.trim()) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urlRedeSocial.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    } catch {
      continue;
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}
