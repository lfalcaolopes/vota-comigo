import type { DeputadoCeapTetoUf } from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import { toEpochMillis } from '@/exercicio/rules/instante';

import { limiteMensalCota } from './limite-mensal-cota';

// O teto do ano é o direito acumulado, não a cobertura do dado: o saldo mensal
// não usado acumula ao longo do exercício, então a régua do total anual é a
// soma dos tetos dos meses em que o deputado teve direito à cota.
export function tetoAnualCota(
  siglaUf: string | null,
  year: number,
  intervalos: readonly IntervaloExercicio[],
): DeputadoCeapTetoUf | null {
  if (siglaUf === null) {
    return null;
  }

  const meses = mesesEmExercicio(year, intervalos);
  if (meses.length === 0) {
    return null;
  }

  let amountCents = 0;
  for (const month of meses) {
    // A tabela vira no meio do mês (o Ato 244/2026 estreia em 20/02): o mês
    // inteiro segue o teto vigente no seu primeiro dia.
    const limite = limiteMensalCota(
      siglaUf,
      `${year}-${String(month).padStart(2, '0')}-01`,
    );
    if (limite === null) {
      return null;
    }
    amountCents += limite;
  }

  return { amountCents, monthCount: meses.length };
}

function mesesEmExercicio(
  year: number,
  intervalos: readonly IntervaloExercicio[],
): readonly number[] {
  const periodos = intervalos.flatMap((intervalo) => {
    const abertura = toEpochMillis(intervalo.openedAt);
    const fechamento =
      intervalo.closedAt === null
        ? Number.POSITIVE_INFINITY
        : toEpochMillis(intervalo.closedAt);

    return abertura === null || fechamento === null
      ? []
      : [{ abertura, fechamento }];
  });

  return Array.from({ length: 12 }, (_, index) => index + 1).filter((month) => {
    const inicio = Date.UTC(year, month - 1, 1);
    const fim = Date.UTC(year, month, 1);
    return periodos.some(
      (periodo) => periodo.abertura < fim && periodo.fechamento > inicio,
    );
  });
}
