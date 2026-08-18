import type { DeputadoPerfilValidYearRange } from "@vota-comigo/shared-types";

export function parseDeputadoPerfilYear(
  raw: string | string[] | undefined,
  defaultYear: number | null,
  validYearRange: DeputadoPerfilValidYearRange | null,
): number | null {
  const year = typeof raw === "string" ? Number(raw) : Number.NaN;

  if (
    Number.isInteger(year) &&
    validYearRange !== null &&
    year >= validYearRange.startYear &&
    year <= validYearRange.endYear
  ) {
    return year;
  }

  return defaultYear;
}

export function buildDeputadoPerfilYearHref(
  pathname: string,
  currentSearch: string,
  year: number,
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("year", String(year));
  return `${pathname}?${params.toString()}`;
}
