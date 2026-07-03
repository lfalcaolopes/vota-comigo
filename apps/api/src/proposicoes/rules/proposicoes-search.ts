import { compareRanking } from './proposicoes-ranking';
import type {
  ProposicaoCardResumo,
  ProposicaoFeedItem,
} from '../types/proposicoes.types';

export function filterProposicoesByQuery(
  computaveis: readonly ProposicaoFeedItem[],
  q: string,
): readonly ProposicaoFeedItem[] {
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return computaveis;

  const citation = parseCitation(q);
  if (citation !== null) {
    return computaveis.filter((r) =>
      matchesCitation(toSearchableProposicao(r.proposicao), citation),
    );
  }

  return computaveis.filter((r) =>
    matchesAllTokens(toSearchableProposicao(r.proposicao), tokens),
  );
}

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

export type ProposicaoSearchMatch = {
  ranked: ProposicaoFeedItem;
  refMatches: number;
};

export function toSearchableProposicao(
  proposicao: ProposicaoCardResumo,
): SearchableProposicao {
  return {
    ementa: normalizeText(proposicao.ementa ?? ''),
    siglaTipo: normalizeText(proposicao.siglaTipo ?? ''),
    numero: proposicao.numero === null ? '' : String(proposicao.numero),
    ano: proposicao.ano === null ? '' : String(proposicao.ano),
  };
}

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

export type Citation = {
  siglaTipo?: string;
  numero: string;
  ano?: string;
};

export function parseCitation(query: string): Citation | null {
  const tokens = tokenizeQuery(query);
  const alphas: string[] = [];
  const nums: string[] = [];

  for (const token of tokens) {
    if (/^[a-z]+$/.test(token)) {
      alphas.push(token);
    } else if (/^\d+$/.test(token)) {
      nums.push(token);
    } else {
      return null;
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

export function matchesCitation(
  fields: SearchableProposicao,
  citation: Citation,
): boolean {
  if (fields.numero !== citation.numero) return false;
  if (
    citation.siglaTipo !== undefined &&
    fields.siglaTipo !== citation.siglaTipo
  )
    return false;
  if (citation.ano !== undefined && fields.ano !== citation.ano) return false;
  return true;
}

export function compareSearchRelevance(
  a: ProposicaoSearchMatch,
  b: ProposicaoSearchMatch,
): number {
  if (a.refMatches !== b.refMatches) {
    return b.refMatches - a.refMatches;
  }
  return compareRanking(a.ranked, b.ranked);
}
