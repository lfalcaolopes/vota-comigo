import type { CsvRecord } from '../sources/csv-reader';
import { extractExternalIdFromUri } from './camara-uri';

export type NormalizedProposicaoTema = {
  externalIdProposicao: number | null;
  codTema: number | null;
  tema: string | null;
};

/**
 * Ponto único de parsing de uma linha de `proposicoesTemas-{ano}.csv`. A
 * proposição é referenciada por `uriProposicao` (não por id), então o external
 * id é extraído do final da URI. O campo `relevancia` é descartado (ADR 0012).
 */
export function normalizeProposicaoTemaRecord(
  record: CsvRecord,
): NormalizedProposicaoTema {
  return {
    externalIdProposicao: extractExternalIdFromUri(record.uriProposicao),
    codTema: parseInteger(record.codTema),
    tema: emptyToNull(record.tema),
  };
}

function parseInteger(value: string | undefined): number | null {
  if (value === undefined || !/^-?\d+$/.test(value.trim())) {
    return null;
  }

  return Number(value.trim());
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  return value;
}
