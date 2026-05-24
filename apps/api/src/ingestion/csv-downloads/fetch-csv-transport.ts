import type { CsvDownloadTransport } from './csv-downloader.types';

export const fetchCsv: CsvDownloadTransport = async (url, options) => {
  const response = await fetch(url, {
    signal: options.signal,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      retryAfter: response.headers.get('Retry-After') ?? undefined,
    };
  }

  if (response.body === null) {
    return {
      ok: false,
      status: response.status,
      statusText: 'Resposta sem corpo.',
    };
  }

  return {
    ok: true,
    body: response.body,
  };
};
