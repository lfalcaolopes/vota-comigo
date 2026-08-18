import type { DeputadoProposicoesAssinadasResponse } from '@vota-comigo/shared-types';

import { somarAssinaturasDoAno } from '../rules/deputado-proposicoes-assinadas';
import type { DeputadoProposicoesAssinadasSource } from '../types/deputados.types';

export function toDeputadoProposicoesAssinadasResponse(
  year: number,
  source: DeputadoProposicoesAssinadasSource,
): DeputadoProposicoesAssinadasResponse {
  if (!source.anoCoberto) {
    return { year, disponivel: false };
  }

  const { total, totalPrimeiroSignatario } = somarAssinaturasDoAno(
    source.assinaturasJson ?? {},
  );

  return {
    year,
    disponivel: true,
    total,
    totalPrimeiroSignatario,
    coveredThroughDate: source.coveredThroughDate,
  };
}
