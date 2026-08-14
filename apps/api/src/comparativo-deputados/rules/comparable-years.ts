import type { DeputadoPerfilValidYearRange } from '@vota-comigo/shared-types';

type ComparableYears = {
  comparableYears: readonly number[];
  defaultYear: number | null;
};

export function deriveComparableYears(
  validYearRanges: readonly (DeputadoPerfilValidYearRange | null)[],
): ComparableYears {
  if (validYearRanges.length === 0 || validYearRanges.includes(null)) {
    return { comparableYears: [], defaultYear: null };
  }

  const ranges = validYearRanges.filter(
    (range): range is DeputadoPerfilValidYearRange => range !== null,
  );
  const startYear = Math.max(...ranges.map((range) => range.startYear));
  const endYear = Math.min(...ranges.map((range) => range.endYear));
  if (startYear > endYear) {
    return { comparableYears: [], defaultYear: null };
  }

  return {
    comparableYears: Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => startYear + index,
    ),
    defaultYear: endYear,
  };
}
