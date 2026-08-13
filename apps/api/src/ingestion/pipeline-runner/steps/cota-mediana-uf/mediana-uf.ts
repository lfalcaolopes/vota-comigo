import type { JanelaExercicioAno } from '@/exercicio/rules/exercicio-ano';
import { exerceuAnoInteiro } from '@/exercicio/rules/exercicio-ano';

import type {
  CotaMedianaUfRow,
  GastoCotaAnualDeputado,
} from './cota-mediana-uf.repository.types';

export type DeriveCotaMedianaUfInput = {
  year: number;
  janela: JanelaExercicioAno;
  gastos: readonly GastoCotaAnualDeputado[];
};

export function deriveCotaMedianaUf(
  input: DeriveCotaMedianaUfInput,
): readonly CotaMedianaUfRow[] {
  const valoresPorUf = new Map<string, number[]>();

  for (const gasto of input.gastos) {
    // Exercício parcial fica de fora: gastou menos por ter exercido menos, e
    // extrapolar para doze meses produziria um número que nunca existiu.
    if (!exerceuAnoInteiro(gasto.intervalos, input.janela)) {
      continue;
    }

    const valores = valoresPorUf.get(gasto.siglaUf) ?? [];
    valores.push(gasto.valorUtilizadoCentavos);
    valoresPorUf.set(gasto.siglaUf, valores);
  }

  return [...valoresPorUf.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([siglaUf, valores]) => ({
      year: input.year,
      siglaUf,
      valorUtilizadoMedianaCentavos: medianaCentavos(valores),
      deputadoCount: valores.length,
    }));
}

function medianaCentavos(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);

  if (ordenados.length % 2 === 1) {
    return ordenados[meio];
  }

  // Amostra par cai em meio centavo; arredondar afastando de zero mantém
  // centavos inteiros sem puxar negativos na direção do positivo.
  const soma = ordenados[meio - 1] + ordenados[meio];
  return Math.sign(soma) * Math.round(Math.abs(soma) / 2);
}
