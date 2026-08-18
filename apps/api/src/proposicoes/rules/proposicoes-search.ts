export type Citation = {
  siglaTipo?: string;
  numero: string;
  ano?: string;
};

export type ProposicoesSearchPlan =
  | { readonly kind: 'citation'; readonly citation: Citation }
  | { readonly kind: 'semantic'; readonly embedding: readonly number[] }
  | { readonly kind: 'tokens'; readonly tokens: readonly string[] };

export function toSearchPlan(query: string): ProposicoesSearchPlan | null {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return null;
  }

  const citation = parseCitation(query);
  return citation === null
    ? { kind: 'tokens', tokens }
    : { kind: 'citation', citation };
}

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function tokenizeQuery(query: string): readonly string[] {
  return normalizeText(query)
    .split(/[\s/]+/)
    .filter((token) => token.length > 0);
}

export function parseCitation(query: string): Citation | null {
  const tokens = tokenizeQuery(query);
  const alphas: string[] = [];
  const nums: string[] = [];

  for (const token of tokens) {
    const runs = toAlphaNumericRuns(token);
    if (runs === null) {
      return null;
    }

    for (const run of runs) {
      if (/^\d+$/.test(run)) {
        nums.push(run);
      } else {
        alphas.push(run);
      }
    }
  }

  if (alphas.length === 1 && nums.length === 2) {
    return {
      siglaTipo: alphas[0],
      numero: String(Number(nums[0])),
      ano: nums[1],
    };
  }

  if (alphas.length === 1 && nums.length === 1) {
    return { siglaTipo: alphas[0], numero: String(Number(nums[0])) };
  }

  if (alphas.length === 0 && nums.length === 2) {
    return { numero: String(Number(nums[0])), ano: nums[1] };
  }

  return null;
}

// tokenizeQuery corta em [\s/]+, entao "PEC3/2021" chega como "pec3": sigla e
// numero colados sao uma citacao, e so um token todo alfanumerico se divide.
function toAlphaNumericRuns(token: string): readonly string[] | null {
  const runs = token.match(/[a-z]+|\d+/g);
  return runs !== null && runs.join('') === token ? runs : null;
}
