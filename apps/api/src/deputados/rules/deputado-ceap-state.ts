import type {
  DeputadoCeapStatus,
  DeputadoPerfilValidYearRange,
} from '@vota-comigo/shared-types';

type DeputadoCeapStateInput = {
  year: number;
  validYearRange: DeputadoPerfilValidYearRange;
  ingestedYears: readonly number[];
  hasGastos: boolean;
};

type DeputadoCeapState = {
  status: DeputadoCeapStatus | null;
  availableYears: readonly number[];
};

export function deriveDeputadoCeapState(
  input: DeputadoCeapStateInput,
): DeputadoCeapState {
  const isValidYear =
    input.year >= input.validYearRange.startYear &&
    input.year <= input.validYearRange.endYear;
  const availableYears = input.ingestedYears.filter(
    (year) =>
      year >= input.validYearRange.startYear &&
      year <= input.validYearRange.endYear,
  );

  return {
    status: !isValidYear
      ? null
      : input.ingestedYears.includes(input.year)
        ? input.hasGastos
          ? 'ok'
          : 'sem-gastos'
        : 'ano-nao-carregado',
    availableYears,
  };
}
