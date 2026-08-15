import type {
  DeputadoDespesasClient,
  DeputadoDespesasFetchOptions,
  DeputadoDespesasFetchResult,
  DeputadoDespesasQuery,
  DespesaCota,
} from '../steps/deputado-gasto-cota-sigepa/deputado-gasto-cota-sigepa.repository.types';
import type { CamaraJsonTransport } from './camara-api-transport';
import {
  DEFAULT_CAMARA_BASE_URL,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_BACKOFF_MS,
  defaultSleep,
  fetchPagedJson,
} from './camara-paged-json';
import { asNumber, asString, isRecord } from './json-value';

// Teto por página aceito pela API. Cada página a menos é uma requisição a
// menos contra o balde de tokens, que não comporta nem um ano inteiro de
// reposição (ADR 022).
const ITENS_POR_PAGINA = 100;

export type CamaraDespesasClientDeps = {
  transport: CamaraJsonTransport;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  retryBackoffMs?: readonly number[];
  baseUrl?: string;
};

export function createDeputadoDespesasClient(
  deps: CamaraDespesasClientDeps,
): DeputadoDespesasClient {
  const sleep = deps.sleep ?? defaultSleep;
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryBackoffMs = deps.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
  const baseUrl = deps.baseUrl ?? DEFAULT_CAMARA_BASE_URL;

  return {
    async fetch(
      query: DeputadoDespesasQuery,
      options?: DeputadoDespesasFetchOptions,
    ): Promise<DeputadoDespesasFetchResult> {
      // Sem idLegislatura a API responde {"dados":[]} com HTTP 200, que é
      // indistinguível de "não teve despesa"; consultar assim seria pior que
      // não consultar.
      if (query.externalIdLegislaturaList.length === 0) {
        return { ok: false, reason: 'consulta sem idLegislatura' };
      }

      const despesas: DespesaCota[] = [];

      for (const externalIdLegislatura of query.externalIdLegislaturaList) {
        const page = await fetchPagedJson(
          despesasUrl(baseUrl, query, externalIdLegislatura),
          {
            transport: deps.transport,
            sleep,
            maxAttempts,
            retryBackoffMs,
            onRetry: toOnRetry(
              query,
              externalIdLegislatura,
              maxAttempts,
              options,
            ),
          },
        );

        if (!page.ok) {
          return { ok: false, reason: page.reason };
        }

        for (const dado of page.dados) {
          despesas.push(toDespesaCota(dado));
        }
      }

      return { ok: true, despesas };
    },
  };
}

// A consulta é por ano inteiro, nunca mês a mês: a janela da reposição decide
// na leitura quais meses substituir (ADR 022).
function despesasUrl(
  baseUrl: string,
  query: DeputadoDespesasQuery,
  externalIdLegislatura: number,
): string {
  return (
    `${baseUrl}/deputados/${query.externalIdDeputado}/despesas` +
    `?ano=${query.year}&idLegislatura=${externalIdLegislatura}` +
    `&itens=${ITENS_POR_PAGINA}`
  );
}

function toOnRetry(
  query: DeputadoDespesasQuery,
  externalIdLegislatura: number,
  maxAttempts: number,
  options: DeputadoDespesasFetchOptions | undefined,
): ((attempt: number, delayMs: number, reason: string) => void) | undefined {
  const emit = options?.onEvent;

  if (emit === undefined) {
    return undefined;
  }

  return (attempt, delayMs, reason) =>
    emit({
      type: 'retry',
      externalIdDeputado: query.externalIdDeputado,
      year: query.year,
      externalIdLegislatura,
      attempt,
      maxAttempts,
      delayMs,
      reason,
    });
}

function toDespesaCota(dado: unknown): DespesaCota {
  const record = isRecord(dado) ? dado : {};

  return {
    ano: asNumber(record.ano),
    mes: asNumber(record.mes),
    tipoDespesa: asString(record.tipoDespesa),
    valorLiquido: asNumber(record.valorLiquido),
  };
}
