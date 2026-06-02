import type { CsvRecord } from '../../csv-reader';
import type { ProposicaoRow } from './proposicoes.repository.types';

export function toProposicaoRow(record: CsvRecord): ProposicaoRow {
  return {
    externalIdProposicao: Number(record.id),
    uri: emptyToNull(record.uri),
    siglaTipo: emptyToNull(record.siglaTipo),
    numero: parseInteger(record.numero),
    ano: parseInteger(record.ano),
    externalCodTipo: parseInteger(record.codTipo),
    descricaoTipo: emptyToNull(record.descricaoTipo),
    ementa: emptyToNull(record.ementa),
    ementaDetalhada: emptyToNull(record.ementaDetalhada),
    keywords: emptyToNull(record.keywords),
    dataApresentacao: emptyToNull(record.dataApresentacao),
    urlInteiroTeor: emptyToNull(record.urlInteiroTeor),
    ultimoStatusDataHora: emptyToNull(record.ultimoStatus_dataHora),
    ultimoStatusSiglaOrgao: emptyToNull(record.ultimoStatus_siglaOrgao),
    ultimoStatusRegime: emptyToNull(record.ultimoStatus_regime),
    ultimoStatusDescricaoSituacao: emptyToNull(
      record.ultimoStatus_descricaoSituacao,
    ),
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
