export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function tokenizeQuery(query: string): readonly string[] {
  return normalizeText(query)
    .split(/[\s/]+/)
    .filter((token) => token.length > 0);
}

export type SearchableProposicao = {
  ementa: string;
  siglaTipo: string;
  numero: string;
  ano: string;
};

function tokenMatchesField(
  fields: SearchableProposicao,
  token: string,
): boolean {
  return (
    token === fields.siglaTipo ||
    token === fields.numero ||
    token === fields.ano ||
    fields.ementa.includes(token)
  );
}

export function matchesAllTokens(
  fields: SearchableProposicao,
  tokens: readonly string[],
): boolean {
  return tokens.every((token) => tokenMatchesField(fields, token));
}

function tokenMatchesIdentifier(
  fields: SearchableProposicao,
  token: string,
): boolean {
  return (
    token === fields.siglaTipo ||
    token === fields.numero ||
    token === fields.ano
  );
}

export function referenceMatchCount(
  fields: SearchableProposicao,
  tokens: readonly string[],
): number {
  return tokens.filter((token) => tokenMatchesIdentifier(fields, token)).length;
}
