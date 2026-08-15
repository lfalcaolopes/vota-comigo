import { toEpochMillis } from '@/exercicio/rules/instante';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

export type LegislaturaPeriodo = {
  externalIdLegislatura: number;
  dataInicio: string | null;
  dataFim: string | null;
};

type Periodo = { inicio: number; fim: number };

// Sem idLegislatura a API de despesas responde {"dados":[]} com HTTP 200, e
// uma constante perderia janeiro inteiro no ano de troca de legislatura
// (ADR 022), então o parâmetro vem do exercício do deputado dentro do ano.
export function deriveLegislaturasNoAno(
  intervalos: readonly IntervaloExercicio[],
  year: number,
  legislaturas: readonly LegislaturaPeriodo[],
): readonly number[] {
  const ano: Periodo = {
    inicio: Date.UTC(year, 0, 1),
    fim: Date.UTC(year + 1, 0, 1),
  };

  const exercicioNoAno = intervalos
    .flatMap((intervalo) => toPeriodo(intervalo))
    .flatMap((periodo) => intersect(periodo, ano));

  const derived = legislaturas
    .filter((legislatura) =>
      exercicioNoAno.some(
        (periodo) =>
          intersect(periodo, toPeriodoLegislatura(legislatura)).length > 0,
      ),
    )
    .map((legislatura) => legislatura.externalIdLegislatura);

  return [...new Set(derived)].sort((a, b) => a - b);
}

function toPeriodo(intervalo: IntervaloExercicio): Periodo[] {
  const inicio = toEpochMillis(intervalo.openedAt);
  const fim =
    intervalo.closedAt === null
      ? Number.POSITIVE_INFINITY
      : toEpochMillis(intervalo.closedAt);

  // um limite ilegível não vira intervalo em aberto: sem instante confiável,
  // o intervalo simplesmente não cobre nada
  return inicio === null || fim === null ? [] : [{ inicio, fim }];
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

function intersect(a: Periodo, b: Periodo): Periodo[] {
  const inicio = Math.max(a.inicio, b.inicio);
  const fim = Math.min(a.fim, b.fim);

  return fim > inicio ? [{ inicio, fim }] : [];
}
