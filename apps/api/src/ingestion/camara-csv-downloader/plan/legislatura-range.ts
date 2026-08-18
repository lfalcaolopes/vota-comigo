const firstLegislatura = 51;
const firstLegislaturaFirstYear = 1999;
const legislaturaYearSpan = 4;

export function deriveLegislaturasFromYears(
  years: readonly number[],
): number[] {
  const legislaturas = years
    .map(legislaturaOfYear)
    .filter((legislatura) => legislatura >= firstLegislatura);

  return [...new Set(legislaturas)].sort(
    (legislatura, other) => legislatura - other,
  );
}

function legislaturaOfYear(year: number): number {
  return (
    firstLegislatura +
    Math.floor((year - firstLegislaturaFirstYear) / legislaturaYearSpan)
  );
}
