import type {
  DeputadoGastoCotaAnoRow,
  DeputadoGastoCotaRow,
} from './deputado-gasto-cota.repository.types';

export function toDeputadoGastoCotaAnoRows(
  rows: readonly DeputadoGastoCotaRow[],
): readonly DeputadoGastoCotaAnoRow[] {
  const anoRows = new Map<string, DeputadoGastoCotaAnoRow>();

  for (const row of rows) {
    const key = `${row.deputadoId}|${row.year}`;
    const anoRow = anoRows.get(key) ?? {
      deputadoId: row.deputadoId,
      year: row.year,
      gastosJson: {},
    };
    const month = String(row.month);
    const categorias = anoRow.gastosJson[month] ?? {};

    categorias[String(row.externalNumSubCota)] = row.valorUtilizadoCentavos;
    anoRow.gastosJson[month] = categorias;
    anoRows.set(key, anoRow);
  }

  return [...anoRows.values()];
}
