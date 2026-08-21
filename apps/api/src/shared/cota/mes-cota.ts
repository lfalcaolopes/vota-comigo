export type MesCota = {
  readonly year: number;
  readonly month: number;
};

export type CoberturaMensal = {
  readonly year: number;
  readonly coveredThroughMonth: number;
};

export type MesesCobertos = {
  readonly meses: readonly MesCota[];
  readonly contigua: boolean;
};

export function enumerateMeses(inicio: string, fim: string): MesCota[] {
  const result: MesCota[] = [];
  for (
    let ordinal = toOrdinalMes(toMesCota(inicio));
    ordinal <= toOrdinalMes(toMesCota(fim));
    ordinal += 1
  ) {
    result.push({ year: Math.floor(ordinal / 12), month: (ordinal % 12) + 1 });
  }
  return result;
}

// A cobertura vale como prefixo da janela: um mês coberto depois de um buraco
// não vira gasto conhecido, porque a soma do intervalo inteiro é que responde.
export function deriveMesesCobertos(input: {
  readonly mesesDaJanela: readonly MesCota[];
  readonly coberturas: readonly CoberturaMensal[];
}): MesesCobertos {
  const coberturaByYear = new Map(
    input.coberturas.map((item) => [item.year, item]),
  );
  const meses = input.mesesDaJanela.filter((mes) => {
    const cobertura = coberturaByYear.get(mes.year);
    return (
      cobertura !== undefined && mes.month <= cobertura.coveredThroughMonth
    );
  });

  return {
    meses,
    contigua: meses.every(
      (mes, index) =>
        toOrdinalMes(mes) === toOrdinalMes(input.mesesDaJanela[index]),
    ),
  };
}

export function toMesCota(date: string): MesCota {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function toOrdinalMes(mes: MesCota): number {
  return mes.year * 12 + mes.month - 1;
}

export function firstDayOfMonth(mes: MesCota): string {
  return `${mes.year}-${String(mes.month).padStart(2, '0')}-01`;
}

export function lastDayOfMonth(mes: MesCota): string {
  return new Date(Date.UTC(mes.year, mes.month, 0)).toISOString().slice(0, 10);
}
