import { toEpochMillis } from '@/exercicio/rules/instante';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

export type Periodo = { inicio: number; fim: number };

export function periodoDoAno(year: number): Periodo {
  return { inicio: Date.UTC(year, 0, 1), fim: Date.UTC(year + 1, 0, 1) };
}

export function exercicioNoAno(
  intervalos: readonly IntervaloExercicio[],
  year: number,
): readonly Periodo[] {
  const ano = periodoDoAno(year);

  return intervalos
    .flatMap((intervalo) => toPeriodo(intervalo))
    .flatMap((periodo) => intersect(periodo, ano));
}

export function isEmExercicioNoAno(
  intervalos: readonly IntervaloExercicio[],
  year: number,
): boolean {
  return exercicioNoAno(intervalos, year).length > 0;
}

export function intersect(a: Periodo, b: Periodo): Periodo[] {
  const inicio = Math.max(a.inicio, b.inicio);
  const fim = Math.min(a.fim, b.fim);

  return fim > inicio ? [{ inicio, fim }] : [];
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
