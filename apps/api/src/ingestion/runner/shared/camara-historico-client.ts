import {
  isTransientHttpStatus,
  retryDelayMs,
} from '../../csv-downloads/retry-policy';
import type {
  DeputadoHistoricoClient,
  DeputadoHistoricoFetchResult,
  HistoricoEvento,
} from '../steps/deputado-historico/deputado-historico.repository.types';
import type { CamaraJsonTransport } from './camara-api-transport';

const DEFAULT_BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_MS: readonly number[] = [1000, 2000];

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
  const baseUrl = deps.baseUrl ?? DEFAULT_BASE_URL;

  return {
    async fetch(
      externalIdDeputado: number,
    ): Promise<DeputadoHistoricoFetchResult> {
      const eventos: HistoricoEvento[] = [];
      let url: string | undefined =
        `${baseUrl}/deputados/${externalIdDeputado}/historico`;

      while (url !== undefined) {
        const page = await fetchPage(url, {
          transport: deps.transport,
          sleep,
          maxAttempts,
          retryBackoffMs,
        });

        if (!page.ok) {
          return { ok: false, reason: page.reason };
        }

        for (const dado of page.dados) {
          eventos.push(toHistoricoEvento(dado));
        }

        url = page.nextUrl;
      }

      return { ok: true, eventos };
    },
  };
}

type PageDeps = {
  transport: CamaraJsonTransport;
  sleep: (ms: number) => Promise<void>;
  maxAttempts: number;
  retryBackoffMs: readonly number[];
};

type PageResult =
  | { ok: true; dados: readonly unknown[]; nextUrl?: string }
  | { ok: false; reason: string };

async function fetchPage(url: string, deps: PageDeps): Promise<PageResult> {
  for (let attempt = 1; attempt <= deps.maxAttempts; attempt += 1) {
    const response = await deps.transport(url);

    if (response.ok) {
      return readPage(response.body);
    }

    const transient = isTransientHttpStatus(response.status);

    if (!transient || attempt === deps.maxAttempts) {
      return {
        ok: false,
        reason: `${response.status} ${response.statusText}`,
      };
    }

    await deps.sleep(retryDelayMs(response, attempt, deps.retryBackoffMs));
  }

  return { ok: false, reason: 'tentativas esgotadas' };
}

function readPage(body: unknown): PageResult {
  const dados = isRecord(body) && Array.isArray(body.dados) ? body.dados : [];
  const links = isRecord(body) && Array.isArray(body.links) ? body.links : [];
  const next = links.find(
    (link): link is { rel: string; href: string } =>
      isRecord(link) && link.rel === 'next' && typeof link.href === 'string',
  );

  return { ok: true, dados, nextUrl: next?.href };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
