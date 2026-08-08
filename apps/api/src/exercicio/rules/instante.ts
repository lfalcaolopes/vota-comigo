// Instantes chegam em formatos diferentes: timestamptz do Postgres
// ('2023-02-01 12:00:00+00') nos intervalos e no histórico, date
// ('2023-02-01') em votacao.data. Comparar as strings direto mistura os
// formatos e erra na fronteira do dia, então tudo vira epoch antes.
export function toEpochMillis(valor: string): number | null {
  const epoch = Date.parse(valor);
  return Number.isNaN(epoch) ? null : epoch;
}
