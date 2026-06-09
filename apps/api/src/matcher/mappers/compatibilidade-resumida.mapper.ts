import type {
  MatcherExecucaoResumo,
  MatcherResultado,
} from '@vota-comigo/shared-types';

import type { CompatibilidadeResumidaResult } from '../types/compatibilidade.types';

export function toMatcherResultadoEstadual(
  resumo: MatcherExecucaoResumo,
  resultado: CompatibilidadeResumidaResult,
): MatcherResultado {
  return {
    ...resumo,
    escopo: 'estadual',
    deputados: [...resultado.deputados],
    totalDeputadosAvaliados: resultado.totalDeputadosAvaliados,
    deputadosHistoricoIncompleto: resultado.deputadosHistoricoIncompleto,
  };
}
