// Despesa como vem de GET /deputados/{id}/despesas. valorGlosa fica de fora
// de propósito: já está descontado de valorLiquido (ADR 022).
export type DespesaCota = {
  ano: number | null;
  mes: number | null;
  tipoDespesa: string | null;
  valorLiquido: number | null;
};

export type DeputadoDespesasQuery = {
  externalIdDeputado: number;
  year: number;
  externalIdLegislaturaList: readonly number[];
};

export type DeputadoDespesasFetchResult =
  | { ok: true; despesas: readonly DespesaCota[] }
  | { ok: false; reason: string };

export type DeputadoDespesasFetchEvent = {
  type: 'retry';
  externalIdDeputado: number;
  year: number;
  externalIdLegislatura: number;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: string;
};

export type DeputadoDespesasFetchOptions = {
  onEvent?: (event: DeputadoDespesasFetchEvent) => void;
};

export type DeputadoDespesasClient = {
  fetch(
    query: DeputadoDespesasQuery,
    options?: DeputadoDespesasFetchOptions,
  ): Promise<DeputadoDespesasFetchResult>;
};

// { mês: centavos }
export type GastoCotaSigepaJson = Record<string, number>;
