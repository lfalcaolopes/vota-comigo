import type { ComparativoProposicoesAssinadas } from '@vota-comigo/shared-types';

import { somarAssinaturasDoAno } from '@/deputados/rules/deputado-proposicoes-assinadas';
import type { DeputadoProposicoesAssinadasSource } from '@/deputados/types/deputados.types';

export function toComparativoProposicoesAssinadas(
  source: DeputadoProposicoesAssinadasSource,
): ComparativoProposicoesAssinadas {
  if (!source.anoCoberto) {
    return { disponivel: false };
  }

  const { total, totalPrimeiroSignatario } = somarAssinaturasDoAno(
    source.assinaturasJson ?? {},
  );

  return {
    disponivel: true,
    total,
    totalPrimeiroSignatario,
    coveredThroughDate: source.coveredThroughDate,
  };
}
