import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type { LegislaturaPeriodo } from './legislaturas-do-ano';

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

export type DeputadoSemReposicao = {
  deputadoId: string;
  externalIdDeputado: number;
  intervalos: readonly IntervaloExercicio[];
};

export type GastoCotaSigepaRow = {
  deputadoId: string;
  year: number;
  gastosJson: GastoCotaSigepaJson;
};

export type GastoCotaSigepaUpsertResult = {
  inserted: number;
  updated: number;
};

export type DeputadoGastoCotaSigepaRepository = {
  // Sem linha em deputado_gasto_cota_sigepa para o ano: o pendente é derivado
  // do banco, sem estado novo (ADR 022).
  loadDeputadosSemReposicao(
    year: number,
  ): Promise<readonly DeputadoSemReposicao[]>;
  loadLegislaturas(): Promise<readonly LegislaturaPeriodo[]>;
  upsert(
    rows: readonly GastoCotaSigepaRow[],
  ): Promise<GastoCotaSigepaUpsertResult>;
};
