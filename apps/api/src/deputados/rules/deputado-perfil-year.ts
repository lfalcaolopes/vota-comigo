import type { DeputadoLegislaturaPeriodo } from '@vota-comigo/shared-types';

type DeputadoPerfilYearSource = {
  legislaturaInicialPeriodo: DeputadoLegislaturaPeriodo | null;
  legislaturaFinalPeriodo: DeputadoLegislaturaPeriodo | null;
};

export function deriveDeputadoPerfilYear(
  source: DeputadoPerfilYearSource,
  currentYear: number,
) {
  const hasCompleteRange =
    source.legislaturaInicialPeriodo !== null &&
    source.legislaturaFinalPeriodo !== null;
  const defaultYear =
    !hasCompleteRange || source.legislaturaFinalPeriodo === null
      ? null
      : Math.min(currentYear, getYear(source.legislaturaFinalPeriodo.dataFim));
  const validYearRange =
    source.legislaturaInicialPeriodo === null || defaultYear === null
      ? null
      : {
          startYear: getYear(source.legislaturaInicialPeriodo.dataInicio),
          endYear: defaultYear,
        };

  return {
    defaultYear,
    validYearRange,
    isValidYear: (year: number) =>
      validYearRange !== null &&
      year >= validYearRange.startYear &&
      year <= validYearRange.endYear,
  };
}

function getYear(date: string): number {
  return Number(date.slice(0, 4));
}
