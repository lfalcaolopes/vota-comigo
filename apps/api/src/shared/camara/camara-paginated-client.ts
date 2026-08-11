import type {
  CamaraFailureKind,
  CamaraJsonTransport,
} from './camara-json-transport';

export const CAMARA_PAGINATED_CLIENT = Symbol('CAMARA_PAGINATED_CLIENT');

export type CamaraPaginatedResult =
  | { ok: true; items: readonly unknown[]; pages: number }
  | {
      ok: false;
      kind: CamaraFailureKind | 'invalid-response';
      status?: number;
      message: string;
      pages: number;
      receivedItems: number;
    };

export interface CamaraPaginatedClient {
  fetchAll(initialUrl: string): Promise<CamaraPaginatedResult>;
}

export function createCamaraPaginatedClient({
  transport,
}: {
  transport: CamaraJsonTransport;
}): CamaraPaginatedClient {
  return {
    async fetchAll(initialUrl: string): Promise<CamaraPaginatedResult> {
      const items: unknown[] = [];
      const visitedUrls = new Set<string>();
      let pages = 0;
      let url: string | undefined = initialUrl;

      while (url !== undefined) {
        if (visitedUrls.has(url)) {
          return {
            ok: false,
            kind: 'invalid-response',
            message: 'paginação cíclica da Câmara',
            pages,
            receivedItems: items.length,
          };
        }
        visitedUrls.add(url);
        const response = await transport(url);

        if (!response.ok) {
          return {
            ok: false,
            kind: response.kind,
            status: response.status,
            message: response.statusText,
            pages,
            receivedItems: items.length,
          };
        }

        pages += 1;
        const page = readPage(response.body);
        if (page === null) {
          return {
            ok: false,
            kind: 'invalid-response',
            message: 'resposta inválida da Câmara',
            pages,
            receivedItems: items.length,
          };
        }

        items.push(...page.items);
        url = page.nextUrl;
      }

      return { ok: true, items, pages };
    },
  };
}

function readPage(
  body: unknown,
): { items: readonly unknown[]; nextUrl?: string } | null {
  if (!isRecord(body) || !Array.isArray(body.dados)) return null;

  const links = Array.isArray(body.links) ? body.links : [];
  const next = links.find(
    (link): link is { rel: string; href: string } =>
      isRecord(link) && link.rel === 'next' && typeof link.href === 'string',
  );

  return { items: body.dados, nextUrl: next?.href };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
