import type { DeputadoPerfilValidYearRange } from "@vota-comigo/shared-types";

export function listDeputadoPerfilYears(
  validYearRange: DeputadoPerfilValidYearRange | null,
): number[] {
  if (validYearRange === null) return [];

  return Array.from(
    { length: validYearRange.endYear - validYearRange.startYear + 1 },
    (_, index) => validYearRange.endYear - index,
  );
}
