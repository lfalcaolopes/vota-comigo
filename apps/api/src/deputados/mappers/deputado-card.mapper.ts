import type { DeputadoCard } from '@vota-comigo/shared-types';

import type { DeputadoCardRow } from '../types/deputados.types';

export function toDeputadoCard(row: DeputadoCardRow): DeputadoCard {
  return {
    externalIdDeputado: row.externalIdDeputado,
    nomePublico: row.nomePublico,
    nomeCivil: row.nomeCivil,
    siglaPartido: row.siglaPartido,
    siglaUf: row.siglaUf,
    urlFoto: row.urlFoto,
    emAtividade: row.emAtividade,
    usoCota: row.usoCota,
  };
}
