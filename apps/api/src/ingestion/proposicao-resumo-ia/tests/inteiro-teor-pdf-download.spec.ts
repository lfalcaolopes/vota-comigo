import {
  createInteiroTeorPdfDownloader,
  type CreateInteiroTeorPdfDownloaderOptions,
} from '../generation/inteiro-teor-pdf-download';

type FetchFn = NonNullable<CreateInteiroTeorPdfDownloaderOptions['fetch']>;

const TEOR_URL =
  'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=1299653';

function makeFetch(response: {
  ok?: boolean;
  status?: number;
  contentLength?: string | null;
  chunks?: readonly Uint8Array[];
  cancel?: jest.Mock;
  readerCancel?: jest.Mock;
}): jest.MockedFunction<FetchFn> {
  const chunks = response.chunks ?? [new Uint8Array([0x25, 0x50, 0x44, 0x46])];

  const fetchMock: FetchFn = async () => {
    let index = 0;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      headers: { get: () => response.contentLength ?? null },
      body: {
        cancel: response.cancel ?? jest.fn(async () => undefined),
        getReader: () => ({
          read: async () =>
            index < chunks.length
              ? { done: false, value: chunks[index++] }
              : { done: true },
          cancel: response.readerCancel ?? jest.fn(async () => undefined),
        }),
      },
      arrayBuffer: async () =>
        Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).buffer,
    };
  };
  return jest.fn(fetchMock);
}

describe('createInteiroTeorPdfDownloader', () => {
  describe('when the PDF is downloaded successfully', () => {
    it('returns a base64 data URI with the pdf media type', async () => {
      // Arrange
      const download = createInteiroTeorPdfDownloader({
        fetch: makeFetch({
          chunks: [new Uint8Array([0x25, 0x50]), new Uint8Array([0x44, 0x46])],
        }),
      });

      // Act
      const outcome = await download(TEOR_URL);

      // Assert
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.dataUri).toBe('data:application/pdf;base64,JVBERg==');
        expect(outcome.bytes).toBe(4);
      }
    });

    it('follows redirects, as the Camara URL redirects to the file', async () => {
      // Arrange
      const fetch = makeFetch({});
      const download = createInteiroTeorPdfDownloader({ fetch });

      // Act
      await download(TEOR_URL);

      // Assert
      expect(fetch).toHaveBeenCalledWith(TEOR_URL, { redirect: 'follow' });
    });
  });

  describe('when the PDF exceeds the size limit', () => {
    it('rejects on the declared content-length without reading the body', async () => {
      // Arrange
      const cancel = jest.fn(async () => undefined);
      const fetch = makeFetch({ contentLength: '130748743', cancel });
      const download = createInteiroTeorPdfDownloader({ fetch });

      // Act
      const outcome = await download(TEOR_URL);

      // Assert
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.tooLarge).toBe(true);
        expect(outcome.reason).toContain('acima do limite');
      }
      expect(cancel).toHaveBeenCalled();
    });

    it('aborts mid-stream when content-length is absent, as the Camara omits it', async () => {
      // Arrange
      const readerCancel = jest.fn(async () => undefined);
      const download = createInteiroTeorPdfDownloader({
        fetch: makeFetch({
          contentLength: null,
          chunks: [new Uint8Array(24), new Uint8Array(24), new Uint8Array(24)],
          readerCancel,
        }),
        maxBytes: 32,
      });

      // Act
      const outcome = await download(TEOR_URL);

      // Assert
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.tooLarge).toBe(true);
        expect(outcome.reason).toContain('durante o download');
      }
      expect(readerCancel).toHaveBeenCalled();
    });
  });

  describe('when the download fails', () => {
    it('returns ok:false on a non-2xx status without flagging tooLarge', async () => {
      // Arrange
      const download = createInteiroTeorPdfDownloader({
        fetch: makeFetch({ ok: false, status: 429 }),
      });

      // Act
      const outcome = await download(TEOR_URL);

      // Assert
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.reason).toContain('HTTP 429');
        expect(outcome.tooLarge).toBeUndefined();
      }
    });

    it('returns ok:false when the network call throws', async () => {
      // Arrange
      const fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
      const download = createInteiroTeorPdfDownloader({ fetch });

      // Act
      const outcome = await download(TEOR_URL);

      // Assert
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.reason).toContain('ECONNRESET');
      }
    });
  });
});
