import type { ComparativoProposicoesAssinadas } from '@vota-comigo/shared-types';

import { somarAssinaturasDoAno } from '@/deputados/rules/deputado-proposicoes-assinadas';
import type { DeputadoProposicoesAssinadasJanelaSource } from '@/deputados/types/deputados.types';

export function toComparativoProposicoesAssinadas(
  source: DeputadoProposicoesAssinadasJanelaSource,
): ComparativoProposicoesAssinadas {
  const anosDescobertos = source.anos
    .filter((ano) => !ano.coberto)
    .map((ano) => ano.year);

  if (anosDescobertos.length > 0) {
    return { disponivel: false, motivo: 'anos-descobertos', anosDescobertos };
  }

  const somas = source.anos.map((ano) =>
    somarAssinaturasDoAno(ano.assinaturasJson ?? {}),
  );

  return {
    disponivel: true,
    total: somas.reduce((acumulado, soma) => acumulado + soma.total, 0),
    totalPrimeiroSignatario: somas.reduce(
      (acumulado, soma) => acumulado + soma.totalPrimeiroSignatario,
      0,
    ),
    coveredThroughDate: source.coveredThroughDate,
  };
}
