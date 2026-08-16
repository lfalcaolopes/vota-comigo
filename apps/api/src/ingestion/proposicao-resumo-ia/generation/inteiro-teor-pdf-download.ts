export type InteiroTeorPdfDownloadOutcome =
  | { ok: true; dataUri: string; bytes: number }
  | { ok: false; reason: string; tooLarge?: boolean };

export type DownloadInteiroTeorPdf = (
  url: string,
) => Promise<InteiroTeorPdfDownloadOutcome>;

// The provider rejects file inputs past roughly this size, and the Camara
// serves a few inteiros teores in the hundreds of megabytes.
export const MAX_INTEIRO_TEOR_PDF_BYTES = 20 * 1024 * 1024;

type ResponseBody = {
  getReader?(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel(): Promise<void>;
  };
  cancel(): Promise<void>;
};

type FetchFn = (
  url: string,
  init: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  body?: ResponseBody | null;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type CreateInteiroTeorPdfDownloaderOptions = {
  fetch?: FetchFn;
  maxBytes?: number;
};

// The PDF is fetched here instead of being handed to the provider as a URL:
// camara.leg.br answers 429 to the provider's egress, which surfaced as an
// opaque HTTP 400 on every attempt.
export function createInteiroTeorPdfDownloader(
  options: CreateInteiroTeorPdfDownloaderOptions = {},
): DownloadInteiroTeorPdf {
  const fetchImpl: FetchFn = options.fetch ?? globalThis.fetch;
  const maxBytes = options.maxBytes ?? MAX_INTEIRO_TEOR_PDF_BYTES;

  return async (url) => {
    try {
      const response = await fetchImpl(url, { redirect: 'follow' });

      if (!response.ok) {
        return {
          ok: false,
          reason: `download do inteiro teor falhou: HTTP ${response.status}`,
        };
      }

      const declaredBytes = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
        await response.body?.cancel();
        return tooLarge(`tem ${formatMegabytes(declaredBytes)} MB`, maxBytes);
      }

      const collected = await collectBody(response, maxBytes);
      if (!collected.ok) return collected;

      return {
        ok: true,
        dataUri: `data:application/pdf;base64,${collected.buffer.toString('base64')}`,
        bytes: collected.buffer.byteLength,
      };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'erro desconhecido';
      return {
        ok: false,
        reason: `download do inteiro teor falhou: ${detail}`,
      };
    }
  };
}

// camara.leg.br answers without content-length, so the ceiling is enforced
// while streaming: the transfer is aborted instead of pulling the whole file.
async function collectBody(
  response: { body?: ResponseBody | null; arrayBuffer(): Promise<ArrayBuffer> },
  maxBytes: number,
): Promise<
  { ok: true; buffer: Buffer } | (InteiroTeorPdfDownloadOutcome & { ok: false })
> {
  const reader = response.body?.getReader?.();

  if (reader === undefined) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      return tooLarge(`tem ${formatMegabytes(buffer.byteLength)} MB`, maxBytes);
    }
    return { ok: true, buffer };
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value === undefined) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return tooLarge(
        `passa de ${formatMegabytes(maxBytes)} MB durante o download`,
        maxBytes,
      );
    }
    chunks.push(Buffer.from(value));
  }

  return { ok: true, buffer: Buffer.concat(chunks) };
}

function tooLarge(
  sizeDescription: string,
  maxBytes: number,
): InteiroTeorPdfDownloadOutcome & { ok: false } {
  return {
    ok: false,
    reason: `inteiro teor ${sizeDescription}, acima do limite de ${formatMegabytes(maxBytes)} MB`,
    tooLarge: true,
  };
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
