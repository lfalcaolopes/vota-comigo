import type { DeputadoGastoCotaRow } from './deputado-gasto-cota.repository.types';

export type GastoCotaInvariantesInput = {
  rows: readonly DeputadoGastoCotaRow[];
  totalValorUtilizadoCentavos: number;
};

export type GastoCotaInvariantesResult =
  | { ok: true }
  | { ok: false; message: string };

export function checkGastoCotaInvariantes(
  input: GastoCotaInvariantesInput,
): GastoCotaInvariantesResult {
  const seen = new Set<string>();
  let anual = 0;

  for (const row of input.rows) {
    if (row.month < 1 || row.month > 12) {
      return {
        ok: false,
        message: `Mês ${row.month} fora do calendário para o deputado ${row.deputadoId}.`,
      };
    }

    const key = `${row.deputadoId}|${row.month}|${row.externalNumSubCota}`;

    if (seen.has(key)) {
      return {
        ok: false,
        message:
          `Agregado duplicado para deputado ${row.deputadoId}, mês ` +
          `${row.month} e categoria ${row.externalNumSubCota}.`,
      };
    }

    seen.add(key);
    anual += row.valorUtilizadoCentavos;
  }

  if (anual !== input.totalValorUtilizadoCentavos) {
    return {
      ok: false,
      message:
        `Soma dos agregados (${anual}) não fecha com o total lido do ` +
        `arquivo (${input.totalValorUtilizadoCentavos}).`,
    };
  }

  return { ok: true };
}
