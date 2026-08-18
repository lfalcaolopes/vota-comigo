import type { DeputadoCeapResponse } from '@vota-comigo/shared-types';

import {
  deriveJanelaExercicioAno,
  exerceuAnoInteiro,
} from '@/exercicio/rules/exercicio-ano';
import { toEpochMillis } from '@/exercicio/rules/instante';
import {
  deriveSigepaDataStatus,
  type GastosCotaJson,
} from '@/shared/cota/reposicao-sigepa';
import { tetoAnualCota } from '@/shared/cota/teto-anual-cota';

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
  anoReposto: boolean;
  gastosJson: GastosCotaJson;
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
    input.gastosJson,
    input.source.categorias,
    input.coveredThroughMonth,
  );
  const sigepaDataStatus = deriveSigepaDataStatus({
    year: input.year,
    coveredThroughMonth: input.coveredThroughMonth,
    anoReposto: input.anoReposto,
  });
  // Ano da janela ainda não reposto não recebe mediana: a lacuna encolhe o gasto
  // de cada deputado em proporção diferente, e uma mediana igualmente encolhida
  // faria quem mais voa parecer quem menos gasta (ADR 022).
  const medianaUf =
    sigepaDataStatus === 'incompleto' ? null : input.source.medianaUf;
  // Sem linha no dump não há UF, e sem UF não há mediana a exigir: é o deputado
  // cujo único gasto do ano veio da reposição.
  if (
    input.status === 'ok' &&
    exercicioAnoCompleto &&
    sigepaDataStatus !== 'incompleto' &&
    input.source.gasto !== null &&
    input.source.medianaUf === null
  ) {
    throw new Error('mediana da UF não encontrada para exercício completo');
  }

  const siglaUf = input.source.gasto?.siglaUf ?? null;

  return {
    year: input.year,
    availableYears: [...input.availableYears],
    status: input.status,
    sigepaDataStatus,
    coveredThroughMonth: input.coveredThroughMonth,
    totalAmountUsedCents: aggregates.totalAmountUsedCents,
    siglaUf,
    exercicioAnoCompleto,
    periodosExercicio: clipIntervalos(input.source.intervalosExercicio, janela),
    medianaUf: exercicioAnoCompleto ? medianaUf : null,
    tetoUf: tetoAnualCota(
      siglaUf,
      input.year,
      input.source.intervalosExercicio,
    ),
    categories: aggregates.categories,
    months: aggregates.months,
  };
}

// O total do comparativo é o mesmo total do perfil: uma segunda soma dos
// mesmos meses divergiria em silêncio no dia em que uma das duas mudasse.
export function somarGastosAteMes(
  gastosJson: Record<string, Record<string, number>>,
  coveredThroughMonth: number,
): number {
  let total = 0;

  for (let month = 1; month <= coveredThroughMonth; month += 1) {
    for (const amountUsedCents of Object.values(
      gastosJson[String(month)] ?? {},
    )) {
      total += amountUsedCents;
    }
  }

  return total;
}

function deriveAggregates(
  gastosJson: GastosCotaJson,
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
    totalAmountUsedCents: somarGastosAteMes(gastosJson, coveredThroughMonth),
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
