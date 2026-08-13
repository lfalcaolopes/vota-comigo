import type { IntervaloExercicio } from '../types/exercicio.types';
import { toEpochMillis } from './instante';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

export type JanelaExercicioAno = {
  inicio: string;
  fim: string;
};

// Em ano de início de legislatura ninguém atravessa 1º de janeiro — todos os
// intervalos abrem na posse. Ancorar a janela no ano civil esvaziaria a
// comparação a cada quatro anos.
export function deriveJanelaExercicioAno(
  year: number,
  datasInicioLegislatura: readonly string[],
): JanelaExercicioAno {
  const inicioAno = Date.UTC(year, 0, 1);
  const posseNoAno = datasInicioLegislatura
    .flatMap((data) => {
      const epoch = toEpochMillis(data);
      return epoch === null ? [] : [epoch];
    })
    .filter((epoch) => new Date(epoch).getUTCFullYear() === year)
    // A sessão de posse acontece no meio do dia, então a janela abre no fim
    // dele: quem tomou posse na sessão exerceu o ano inteiro possível.
    .map((epoch) => epoch + DIA_EM_MILLIS);

  return {
    inicio: new Date(Math.max(inicioAno, ...posseNoAno)).toISOString(),
    fim: new Date(Date.UTC(year + 1, 0, 1)).toISOString(),
  };
}

export function exerceuAnoInteiro(
  intervalos: readonly IntervaloExercicio[],
  janela: JanelaExercicioAno,
): boolean {
  const inicio = toEpochMillis(janela.inicio);
  const fim = toEpochMillis(janela.fim);

  if (inicio === null || fim === null) {
    return false;
  }

  const ordenados = intervalos
    .flatMap((intervalo) => {
      const abertura = toEpochMillis(intervalo.openedAt);
      const fechamento =
        intervalo.closedAt === null
          ? Number.POSITIVE_INFINITY
          : toEpochMillis(intervalo.closedAt);

      // um limite ilegível não vira intervalo em aberto: sem instante
      // confiável, o intervalo simplesmente não cobre nada
      return abertura === null || fechamento === null
        ? []
        : [{ abertura, fechamento }];
    })
    .sort((a, b) => a.abertura - b.abertura);

  let coberturaAte = inicio;

  for (const { abertura, fechamento } of ordenados) {
    if (abertura > coberturaAte) {
      return false;
    }
    coberturaAte = Math.max(coberturaAte, fechamento);
    if (coberturaAte >= fim) {
      return true;
    }
  }

  return false;
}
