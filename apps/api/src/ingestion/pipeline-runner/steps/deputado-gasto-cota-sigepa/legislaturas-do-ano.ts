import { toEpochMillis } from '@/exercicio/rules/instante';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { exercicioNoAno, intersect, type Periodo } from './exercicio-no-ano';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

export type LegislaturaPeriodo = {
  externalIdLegislatura: number;
  dataInicio: string | null;
  dataFim: string | null;
};

// Sem idLegislatura a API de despesas responde {"dados":[]} com HTTP 200, e
// uma constante perderia janeiro inteiro no ano de troca de legislatura
// (ADR 022), então o parâmetro vem do exercício do deputado dentro do ano.
export function deriveLegislaturasNoAno(
  intervalos: readonly IntervaloExercicio[],
  year: number,
  legislaturas: readonly LegislaturaPeriodo[],
): readonly number[] {
  const periodos = exercicioNoAno(intervalos, year);

  const derived = legislaturas
    .filter((legislatura) =>
      periodos.some(
        (periodo) =>
          intersect(periodo, toPeriodoLegislatura(legislatura)).length > 0,
      ),
    )
    .map((legislatura) => legislatura.externalIdLegislatura);

  return [...new Set(derived)].sort((a, b) => a - b);
}

function toPeriodoLegislatura(legislatura: LegislaturaPeriodo): Periodo {
  const inicio =
    legislatura.dataInicio === null
      ? null
      : toEpochMillis(legislatura.dataInicio);
  const fim =
    legislatura.dataFim === null ? null : toEpochMillis(legislatura.dataFim);

  return {
    inicio: inicio ?? Number.NEGATIVE_INFINITY,
    // dataFim é o último dia da legislatura, não o instante em que ela acaba
    fim: fim === null ? Number.POSITIVE_INFINITY : fim + DIA_EM_MILLIS,
  };
}
