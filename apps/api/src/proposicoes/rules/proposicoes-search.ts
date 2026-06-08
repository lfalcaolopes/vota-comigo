import { compareRanking } from './proposicoes-ranking';
import type {
  ProposicaoWithVotacoes,
  RankedProposicao,
} from '../types/proposicoes.types';

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
  ranked: RankedProposicao;
  refMatches: number;
};

export function toSearchableProposicao(
  proposicao: ProposicaoWithVotacoes,
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

export function compareSearchRelevance(
  a: ProposicaoSearchMatch,
  b: ProposicaoSearchMatch,
): number {
  if (a.refMatches !== b.refMatches) {
    return b.refMatches - a.refMatches;
  }
  return compareRanking(a.ranked, b.ranked);
}
