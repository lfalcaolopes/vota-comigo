import type { CsvRecord } from '../csv-reader';
import { extractExternalIdFromUri } from './camara-uri';

/**
 * Partido observado em uma linha de `votacoesVotos`.
 * - `observed`: `uriPartido` rendeu um identificador externo numérico.
 * - `absent`: `uriPartido` ausente ou vazio (a linha não traz partido).
 * - `invalid`: `uriPartido` presente, mas sem identificador numérico no final.
 */
export type PartidoObservation =
  | {
      status: 'observed';
      externalIdPartido: number;
      sigla: string | null;
      uri: string;
    }
  | { status: 'absent' }
  | { status: 'invalid'; uri: string };

export type NormalizedDeputadoRef = {
  externalId: number | null;
  uri: string | null;
  nome: string | null;
  siglaUf: string | null;
  idLegislatura: number | null;
  urlFoto: string | null;
};

export type NormalizedVotacaoVoto = {
  idVotacao: string | null;
  uriVotacao: string | null;
  dataHoraVoto: string | null;
  voto: string | null;
  deputado: NormalizedDeputadoRef;
  partido: PartidoObservation;
};

/**
 * Ponto único de parsing de uma linha de `votacoesVotos-{ano}.csv`. Mapeia os
 * campos da fonte (preservando a grafia da Câmara) e expõe o partido observado,
 * para que os passos de partidos, votações nominais e votos agregados reusem o
 * mesmo normalizador sem reparsing independente.
 */
export function normalizeVotacaoVotoRecord(
  record: CsvRecord,
): NormalizedVotacaoVoto {
  return {
    idVotacao: emptyToNull(record.idVotacao),
    uriVotacao: emptyToNull(record.uriVotacao),
    dataHoraVoto: emptyToNull(record.dataHoraVoto),
    voto: emptyToNull(record.voto),
    deputado: {
      externalId: extractExternalIdFromUri(record.deputado_uri),
      uri: emptyToNull(record.deputado_uri),
      nome: emptyToNull(record.deputado_nome),
      siglaUf: emptyToNull(record.deputado_siglaUf),
      idLegislatura: parsePositiveInteger(record.deputado_idLegislatura),
      urlFoto: emptyToNull(record.deputado_urlFoto),
    },
    partido: observePartido(record),
  };
}

function observePartido(record: CsvRecord): PartidoObservation {
  const uri = emptyToNull(record.deputado_uriPartido);

  if (uri === null) {
    return { status: 'absent' };
  }

  const externalIdPartido = extractExternalIdFromUri(uri);

  if (externalIdPartido === null) {
    return { status: 'invalid', uri };
  }

  return {
    status: 'observed',
    externalIdPartido,
    sigla: emptyToNull(record.deputado_siglaPartido),
    uri,
  };
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value.trim())) {
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
