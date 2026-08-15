import type { IngestionReporter } from '../../types/ingestion-pipeline-runner.types';
import type { DeputadoGastoCotaRow } from './deputado-gasto-cota.repository.types';

// A Câmara publica passagem aérea sob duas categorias no dump anual: 998
// (SIGEPA) e 999 (RPA). Ver ADR 022 e docs/ingestion/cota-passagem-aerea-sigepa.md.
export const CATEGORIA_PASSAGEM_AEREA_SIGEPA = 998;
export const CATEGORIA_PASSAGEM_AEREA_RPA = 999;

const NOME_MES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

export type PassagemAereaTotalMes = {
  month: number;
  // null distingue mês sem nenhuma linha da categoria de mês com linhas que somam zero.
  totalValorUtilizadoCentavos: number | null;
};

export function derivePassagemAereaPorMes(
  rows: readonly DeputadoGastoCotaRow[],
  externalNumSubCota: number,
): readonly PassagemAereaTotalMes[] {
  const totalByMonth = new Map<number, number>();

  for (const row of rows) {
    if (row.externalNumSubCota !== externalNumSubCota) {
      continue;
    }

    totalByMonth.set(
      row.month,
      (totalByMonth.get(row.month) ?? 0) + row.valorUtilizadoCentavos,
    );
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month,
      totalValorUtilizadoCentavos: totalByMonth.get(month) ?? null,
    };
  });
}

export function logPassagemAereaPorMes(
  reporter: IngestionReporter | undefined,
  label: string,
  rows: readonly DeputadoGastoCotaRow[],
): void {
  if (reporter === undefined) {
    return;
  }

  for (const [nome, externalNumSubCota] of [
    ['SIGEPA', CATEGORIA_PASSAGEM_AEREA_SIGEPA],
    ['RPA', CATEGORIA_PASSAGEM_AEREA_RPA],
  ] as const) {
    const partes = derivePassagemAereaPorMes(rows, externalNumSubCota)
      .map(({ month, totalValorUtilizadoCentavos }) =>
        totalValorUtilizadoCentavos === null
          ? `${NOME_MES[month - 1]}=sem registro`
          : `${NOME_MES[month - 1]}=${formatReais(totalValorUtilizadoCentavos)}`,
      )
      .join('; ');

    reporter.log(
      `[${label}] passagem aérea ${nome} (${externalNumSubCota}) por mês: ${partes}`,
    );
  }
}

function formatReais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2)}`;
}
