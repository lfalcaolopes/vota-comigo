import { createHash } from 'node:crypto';

export type ProposicaoResumoIaSource = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  descricaoTipo: string | null;
  ementa: string | null;
  ementaDetalhada: string | null;
  keywords: string | null;
  urlInteiroTeor: string | null;
};

function normalizeText(value: string | null): string | null {
  return value === null ? null : value.replace(/\s+/g, ' ').trim();
}

export function calculateProposicaoResumoIaSourceHash(
  source: ProposicaoResumoIaSource,
): string {
  const payload = {
    externalIdProposicao: source.externalIdProposicao,
    siglaTipo: normalizeText(source.siglaTipo),
    numero: source.numero,
    ano: source.ano,
    descricaoTipo: normalizeText(source.descricaoTipo),
    ementa: normalizeText(source.ementa),
    ementaDetalhada: normalizeText(source.ementaDetalhada),
    keywords: normalizeText(source.keywords),
    urlInteiroTeor: normalizeText(source.urlInteiroTeor),
  };

  return createHash('sha256')
    .update(JSON.stringify(payload), 'utf8')
    .digest('hex');
}
