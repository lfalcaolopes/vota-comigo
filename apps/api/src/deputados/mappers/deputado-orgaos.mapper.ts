import type {
  DeputadoOrgao,
  DeputadoOrgaosResponse,
} from '@vota-comigo/shared-types';

import { sortDeputadoOrgaos } from '../rules/deputado-orgaos';
import type { DeputadoOrgaoSource } from '../types/deputados.types';

export function toDeputadoOrgaosResponse(
  year: number,
  source: readonly DeputadoOrgaoSource[],
): DeputadoOrgaosResponse {
  const items: DeputadoOrgao[] = source.flatMap((item) =>
    item.nome === null || item.titulo === null
      ? []
      : [
          {
            externalIdOrgao: item.externalIdOrgao,
            siglaOrgao: item.siglaOrgao,
            nome: item.nome,
            titulo: item.titulo,
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
          },
        ],
  );
  const sorted = sortDeputadoOrgaos(items);

  return { year, items: [...sorted], total: sorted.length };
}
