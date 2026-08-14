import type { DeputadoCeapResponse } from '@vota-comigo/shared-types';

import {
  deriveJanelaExercicioAno,
  exerceuAnoInteiro,
} from '@/exercicio/rules/exercicio-ano';
import { toEpochMillis } from '@/exercicio/rules/instante';

import type { DeputadoCeapSource } from '../types/deputados.types';

type DeputadoCeapLoadedResponse = Extract<
  DeputadoCeapResponse,
  { coveredThroughMonth: number }
>;

type DeputadoCeapLoadedInput = {
  year: number;
  availableYears: readonly number[];
  status: DeputadoCeapLoadedResponse['status'];
  coveredThroughMonth: number;
  source: DeputadoCeapSource;
};

export function toDeputadoCeapLoadedResponse(
  input: DeputadoCeapLoadedInput,
): DeputadoCeapLoadedResponse {
  const janela = deriveJanelaExercicioAno(
    input.year,
    input.source.datasInicioLegislatura,
  );

  const exercicioAnoCompleto = exerceuAnoInteiro(
    input.source.intervalosExercicio,
    janela,
  );
  const aggregates = deriveAggregates(
    input.source.gasto?.gastosJson ?? {},
    input.source.categorias,
    input.coveredThroughMonth,
  );
  const sigepaDataStatus = deriveSigepaDataStatus(
    input.year,
    input.coveredThroughMonth,
  );
  if (
    input.status === 'ok' &&
    exercicioAnoCompleto &&
    sigepaDataStatus !== 'incompleto' &&
    input.source.medianaUf === null
  ) {
    throw new Error('mediana da UF não encontrada para exercício completo');
  }

  return {
    year: input.year,
    availableYears: [...input.availableYears],
    status: input.status,
    sigepaDataStatus,
    coveredThroughMonth: input.coveredThroughMonth,
    totalAmountUsedCents: aggregates.totalAmountUsedCents,
    siglaUf: input.source.gasto?.siglaUf ?? null,
    exercicioAnoCompleto,
    periodosExercicio: clipIntervalos(input.source.intervalosExercicio, janela),
    medianaUf:
      exercicioAnoCompleto && sigepaDataStatus !== 'incompleto'
        ? input.source.medianaUf
        : null,
    categories: aggregates.categories,
    months: aggregates.months,
  };
}

function deriveSigepaDataStatus(
  year: number,
  coveredThroughMonth: number,
): DeputadoCeapLoadedResponse['sigepaDataStatus'] {
  if (year < 2019) return 'nao-aplicavel';
  if (year === 2025 && coveredThroughMonth >= 8) return 'incompleto';
  if (year === 2026) return 'incompleto';
  return 'completo';
}

function deriveAggregates(
  gastosJson: Record<string, Record<string, number>>,
  categoriasSource: DeputadoCeapSource['categorias'],
  coveredThroughMonth: number,
) {
  const descriptionByNumSubCota = new Map(
    categoriasSource.map((item) => [item.externalNumSubCota, item.description]),
  );
  const annualByNumSubCota = new Map<number, number>();
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    if (month > coveredThroughMonth) {
      return { month, totalAmountUsedCents: null, categories: [] };
    }

    const categories = Object.entries(gastosJson[String(month)] ?? {})
      .map(([externalNumSubCota, amountUsedCents]) => ({
        externalNumSubCota: Number(externalNumSubCota),
        amountUsedCents,
      }))
      .sort((a, b) => a.externalNumSubCota - b.externalNumSubCota);

    for (const category of categories) {
      annualByNumSubCota.set(
        category.externalNumSubCota,
        (annualByNumSubCota.get(category.externalNumSubCota) ?? 0) +
          category.amountUsedCents,
      );
    }

    return {
      month,
      totalAmountUsedCents: categories.reduce(
        (total, category) => total + category.amountUsedCents,
        0,
      ),
      categories,
    };
  });

  const categories = [...annualByNumSubCota.entries()]
    .sort(([a], [b]) => a - b)
    .map(([externalNumSubCota, amountUsedCents]) => {
      const description = descriptionByNumSubCota.get(externalNumSubCota);
      if (description === undefined) {
        throw new Error(
          `categoria da cota ${externalNumSubCota} não encontrada`,
        );
      }
      return { externalNumSubCota, description, amountUsedCents };
    });

  return {
    totalAmountUsedCents: categories.reduce(
      (total, category) => total + category.amountUsedCents,
      0,
    ),
    categories,
    months,
  };
}

function clipIntervalos(
  intervalos: DeputadoCeapSource['intervalosExercicio'],
  janela: { inicio: string; fim: string },
) {
  const inicioJanela = toEpochMillis(janela.inicio);
  const fimJanela = toEpochMillis(janela.fim);
  if (inicioJanela === null || fimJanela === null) {
    return [];
  }

  return intervalos
    .flatMap((intervalo) => {
      const inicio = toEpochMillis(intervalo.openedAt);
      const fim =
        intervalo.closedAt === null
          ? fimJanela
          : toEpochMillis(intervalo.closedAt);
      if (inicio === null || fim === null) {
        return [];
      }

      const startDate = Math.max(inicio, inicioJanela);
      const endDate = Math.min(fim, fimJanela);
      return startDate < endDate
        ? [
            {
              startDate: new Date(startDate).toISOString(),
              endDate: new Date(endDate).toISOString(),
            },
          ]
        : [];
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
