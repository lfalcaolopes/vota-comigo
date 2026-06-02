import type { CsvRecord } from '../csv-reader';

export type NormalizedVotacaoProposicao = {
  idVotacao: string | null;
  proposicaoId: number | null;
  proposicaoAno: number | null;
  siglaTipo: string | null;
  codTipo: number | null;
  numero: number | null;
  titulo: string | null;
  ementa: string | null;
};

/**
 * Ponto único de parsing de uma linha de `votacoesProposicoes-{ano}.csv`. Expõe
 * o vínculo canônico votação-proposição e o ano da proposição afetada, para que
 * a derivação do conjunto necessário e o passo de vínculo reusem o mesmo
 * normalizador sem reparsing independente.
 */
export function normalizeVotacaoProposicaoRecord(
  record: CsvRecord,
): NormalizedVotacaoProposicao {
  return {
    idVotacao: emptyToNull(record.idVotacao),
    proposicaoId: parseInteger(record.proposicao_id),
    proposicaoAno: parseInteger(record.proposicao_ano),
    siglaTipo: emptyToNull(record.proposicao_siglaTipo),
    codTipo: parseInteger(record.proposicao_codTipo),
    numero: parseInteger(record.proposicao_numero),
    titulo: emptyToNull(record.proposicao_titulo),
    ementa: emptyToNull(record.proposicao_ementa),
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
