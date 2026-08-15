import type {
  ComparativoOrgao,
  ComparativoOrgaos,
} from '@vota-comigo/shared-types';

import { sortDeputadoOrgaos } from '@/deputados/rules/deputado-orgaos';
import type { DeputadoOrgaoSource } from '@/deputados/types/deputados.types';

export function toComparativoOrgaos(
  source: readonly DeputadoOrgaoSource[],
): ComparativoOrgaos {
  const items: ComparativoOrgao[] = source.flatMap((item) =>
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

  return { items: [...sorted], total: sorted.length };
}
