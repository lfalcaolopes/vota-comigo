import type {
  DeputadoHistoricoClient,
  DeputadoHistoricoFetchResult,
  DeputadoHistoricoFetchOptions,
  HistoricoEvento,
} from '../steps/deputado-historico/deputado-historico.repository.types';
import type { CamaraJsonTransport } from './camara-api-transport';
import {
  DEFAULT_CAMARA_BASE_URL,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_BACKOFF_MS,
  defaultSleep,
  fetchPagedJson,
} from './camara-paged-json';
import { asNumber, asString, isRecord } from './json-value';

export type CamaraHistoricoClientDeps = {
  transport: CamaraJsonTransport;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  retryBackoffMs?: readonly number[];
  baseUrl?: string;
};

export function createDeputadoHistoricoClient(
  deps: CamaraHistoricoClientDeps,
): DeputadoHistoricoClient {
  const sleep = deps.sleep ?? defaultSleep;
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryBackoffMs = deps.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
  const baseUrl = deps.baseUrl ?? DEFAULT_CAMARA_BASE_URL;

  return {
    async fetch(
      externalIdDeputado: number,
      options?: DeputadoHistoricoFetchOptions,
    ): Promise<DeputadoHistoricoFetchResult> {
      const emit = options?.onEvent;
      const onRetry = emit
        ? (attempt: number, delayMs: number, reason: string) =>
            emit({
              type: 'retry',
              externalIdDeputado,
              attempt,
              maxAttempts,
              delayMs,
              reason,
            })
        : undefined;

      const page = await fetchPagedJson(
        `${baseUrl}/deputados/${externalIdDeputado}/historico`,
        {
          transport: deps.transport,
          sleep,
          maxAttempts,
          retryBackoffMs,
          onRetry,
        },
      );

      if (!page.ok) {
        return { ok: false, reason: page.reason };
      }

      return { ok: true, eventos: page.dados.map(toHistoricoEvento) };
    },
  };
}

function toHistoricoEvento(dado: unknown): HistoricoEvento {
  const record = isRecord(dado) ? dado : {};

  return {
    dataHora: asString(record.dataHora) ?? '',
    situacao: asString(record.situacao),
    condicaoEleitoral: asString(record.condicaoEleitoral),
    descricaoStatus: asString(record.descricaoStatus) ?? '',
    siglaPartido: asString(record.siglaPartido),
    uriPartido: asString(record.uriPartido),
    idLegislatura: asNumber(record.idLegislatura),
    nome: asString(record.nome),
    nomeEleitoral: asString(record.nomeEleitoral),
    siglaUf: asString(record.siglaUf),
    email: asString(record.email),
    urlFoto: asString(record.urlFoto),
  };
}
