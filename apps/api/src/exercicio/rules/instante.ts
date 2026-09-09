// Instantes chegam em formatos diferentes: timestamptz do Postgres
// ('2023-02-01 12:00:00+00') nos intervalos e no histórico, date
// ('2023-02-01') em votacao.data. Comparar as strings direto mistura os
// formatos e erra na fronteira do dia, então tudo vira epoch antes.
export function toEpochMillis(valor: string): number | null {
  const epoch = Date.parse(valor);
  return Number.isNaN(epoch) ? null : epoch;
}

// O contrato público expõe instantes em ISO 8601, mas o timestamptz do Postgres
// chega como '2026-08-21 05:51:47.06+00' — formato que o Google recusa em
// <lastmod> e que nenhuma outra fronteira deve ver.
export function toIsoUtc(valor: string): string | null {
  const epoch = toEpochMillis(valor);
  return epoch === null ? null : new Date(epoch).toISOString();
}
