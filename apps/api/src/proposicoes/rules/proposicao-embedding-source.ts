import { createHash } from 'node:crypto';

import type { ProposicaoResumoIaCardProjection } from '../types/proposicoes.types';
import { hasResumoIaPublico } from './proposicao-resumo-ia-public';

export type ProposicaoEmbeddingResumoIa = ProposicaoResumoIaCardProjection & {
  resumoDetalhe: string | null;
};

export type ProposicaoEmbeddingSource = {
  ementa: string | null;
  keywords: string | null;
  resumoIa: ProposicaoEmbeddingResumoIa | null;
};

// Texto natural, com acento: semAcento() e normalizeText() existem para o LIKE
// casar os dois lados da comparacao e degradam o embedding.
export function toProposicaoEmbeddingText(
  source: ProposicaoEmbeddingSource,
): string {
  const resumoIa = hasResumoIaPublico(source.resumoIa) ? source.resumoIa : null;

  return [
    source.ementa,
    source.keywords,
    resumoIa?.resumoCard ?? null,
    resumoIa?.resumoDetalhe ?? null,
  ]
    .map(collapseWhitespace)
    .filter((part) => part.length > 0)
    .join('\n');
}

export function calculateProposicaoEmbeddingSourceHash(
  source: ProposicaoEmbeddingSource,
  model: string,
): string {
  const payload = { text: toProposicaoEmbeddingText(source), model };

  return createHash('sha256')
    .update(JSON.stringify(payload), 'utf8')
    .digest('hex');
}

function collapseWhitespace(value: string | null): string {
  return value === null ? '' : value.replace(/\s+/g, ' ').trim();
}
