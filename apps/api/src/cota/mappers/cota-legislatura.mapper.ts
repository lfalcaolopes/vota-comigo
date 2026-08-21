import type {
  CotaLegislaturaCategory,
  CotaLegislaturaResponse,
} from '@vota-comigo/shared-types';

import { isAnoReposto } from '@/shared/cota/ano-reposto';
import type { MesCota } from '@/shared/cota/mes-cota';
import {
  applyReposicaoSigepa,
  type GastosCotaJson,
} from '@/shared/cota/reposicao-sigepa';
import type { UsoCotaCobertura } from '@/shared/cota/uso-cota';

import type { JanelaCotaLegislatura } from '../rules/janela-cota-legislatura';
import type {
  CotaCategoria,
  CotaGastoAno,
  CotaGastoSigepaAno,
} from '../types/cota.types';

export type ToCotaLegislaturaResponseInput = {
  readonly legislatura: { legislatura: number; dataInicio: string };
  readonly janela: JanelaCotaLegislatura;
  readonly coberturas: readonly UsoCotaCobertura[];
  readonly categorias: readonly CotaCategoria[];
  readonly gastos: readonly CotaGastoAno[];
  readonly gastosSigepa: readonly CotaGastoSigepaAno[];
};

type DeputadoAno = {
  deputadoId: string;
  year: number;
  gastosJson: GastosCotaJson | null;
  gastosSigepaJson: Record<string, number> | null;
};

export function toCotaLegislaturaResponse(
  input: ToCotaLegislaturaResponseInput,
): CotaLegislaturaResponse {
  const coberturaByYear = new Map(
    input.coberturas.map((item) => [item.year, item]),
  );
  const mesesByYear = groupMesesByYear(input.janela.mesesCobertos);
  const amountByNumSubCota = new Map<number, number>();
  const deputadoIds = new Set<string>();

  for (const item of mergeGastos(input.gastos, input.gastosSigepa)) {
    const cobertura = coberturaByYear.get(item.year);
    const gastosJson = applyReposicaoSigepa({
      year: item.year,
      anoReposto: cobertura !== undefined && isAnoReposto(cobertura),
      gastosJson: item.gastosJson,
      gastosSigepaJson: item.gastosSigepaJson,
    });
    if (gastosJson === null) {
      continue;
    }

    deputadoIds.add(item.deputadoId);
    for (const month of mesesByYear.get(item.year) ?? []) {
      for (const [externalNumSubCota, amountUsedCents] of Object.entries(
        gastosJson[String(month)] ?? {},
      )) {
        amountByNumSubCota.set(
          Number(externalNumSubCota),
          (amountByNumSubCota.get(Number(externalNumSubCota)) ?? 0) +
            amountUsedCents,
        );
      }
    }
  }

  const categories = toCategories(amountByNumSubCota, input.categorias);

  return {
    legislatura: input.legislatura.legislatura,
    periodStart: input.legislatura.dataInicio.slice(0, 10),
    coberturaAte: input.janela.coberturaAte,
    deputadoCount: deputadoIds.size,
    totalAmountUsedCents: categories.reduce(
      (total, category) => total + category.amountUsedCents,
      0,
    ),
    categories: [...categories],
  };
}

// O dump e a reposição chegam em tabelas separadas, e um deputado-ano pode
// existir só de um dos lados: quem voou no mês reposto sem linha no dump entra
// pela reposição, e quem foi consultado sem voar não entra por nenhum.
function mergeGastos(
  gastos: readonly CotaGastoAno[],
  gastosSigepa: readonly CotaGastoSigepaAno[],
): readonly DeputadoAno[] {
  const merged = new Map<string, DeputadoAno>();
  const keyOf = (deputadoId: string, year: number) => `${deputadoId}:${year}`;

  for (const item of gastos) {
    merged.set(keyOf(item.deputadoId, item.year), {
      deputadoId: item.deputadoId,
      year: item.year,
      gastosJson: item.gastosJson,
      gastosSigepaJson: null,
    });
  }
  for (const item of gastosSigepa) {
    const key = keyOf(item.deputadoId, item.year);
    merged.set(key, {
      deputadoId: item.deputadoId,
      year: item.year,
      gastosJson: merged.get(key)?.gastosJson ?? null,
      gastosSigepaJson: item.gastosJson,
    });
  }

  return [...merged.values()];
}

function groupMesesByYear(
  meses: readonly MesCota[],
): ReadonlyMap<number, readonly number[]> {
  const byYear = new Map<number, number[]>();
  for (const mes of meses) {
    byYear.set(mes.year, [...(byYear.get(mes.year) ?? []), mes.month]);
  }
  return byYear;
}

function toCategories(
  amountByNumSubCota: ReadonlyMap<number, number>,
  categorias: readonly CotaCategoria[],
): readonly CotaLegislaturaCategory[] {
  const descriptionByNumSubCota = new Map(
    categorias.map((item) => [item.externalNumSubCota, item.description]),
  );

  return [...amountByNumSubCota.entries()]
    .map(([externalNumSubCota, amountUsedCents]) => {
      const description = descriptionByNumSubCota.get(externalNumSubCota);
      if (description === undefined) {
        throw new Error(
          `categoria da cota ${externalNumSubCota} não encontrada`,
        );
      }
      return { externalNumSubCota, description, amountUsedCents };
    })
    .sort(
      (a, b) =>
        b.amountUsedCents - a.amountUsedCents ||
        a.externalNumSubCota - b.externalNumSubCota,
    );
}
