export type CsvDownloaderResult =
  | CsvDownloaderSuccessResult
  | CsvDownloaderErrorResult;

export type CsvDownloaderSuccessResult = {
  ok: true;
  message: string;
  args: readonly string[];
  config: CsvDownloaderConfig;
  plan: readonly CsvDownloadPlanItem[];
};

export type CsvDownloaderErrorResult = {
  ok: false;
  message: string;
  args: readonly string[];
};

export type CsvDownloaderConfig = {
  years: readonly number[];
  force: boolean;
};

export type CsvDownloadPlanItem = {
  dataset: string;
  filename: string;
  url: string;
  localPath: string;
};

export type CsvPlanItemDownloadResult =
  | {
      status: 'downloaded';
      item: CsvDownloadPlanItem;
      message: string;
    }
  | {
      status: 'skipped';
      item: CsvDownloadPlanItem;
      message: string;
    }
  | {
      status: 'failed';
      item: CsvDownloadPlanItem;
      message: string;
      error?: unknown;
    };

export type CsvDownloadTransportResponse =
  | {
      ok: true;
      body: AsyncIterable<Uint8Array>;
    }
  | {
      ok: false;
      status: number;
      statusText: string;
    };

export type CsvDownloadTransport = (
  url: string,
) => Promise<CsvDownloadTransportResponse>;

export type CsvPlanItemFileSystem = {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  write(path: string, body: AsyncIterable<Uint8Array>): Promise<void>;
  rename(from: string, to: string): Promise<void>;
};

export type CsvPlanItemDownloaderOptions = {
  force?: boolean;
  transport?: CsvDownloadTransport;
  fileSystem?: CsvPlanItemFileSystem;
};

export type CsvDownloaderConfigResolution =
  | {
      ok: true;
      config: CsvDownloaderConfig;
    }
  | {
      ok: false;
      message: string;
    };

export type CsvDownloaderOptions = {
  baseUrl?: string;
  currentYear?: number;
};
