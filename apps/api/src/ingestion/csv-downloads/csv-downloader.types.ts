export type CsvDownloaderResult =
  | CsvDownloaderSuccessResult
  | CsvDownloaderErrorResult;

export type CsvDownloaderExecutionResult =
  | CsvDownloaderExecutionSuccessResult
  | CsvDownloaderExecutionErrorResult;

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

export type CsvDownloaderExecutionSuccessResult = CsvDownloaderSuccessResult & {
  exitCode: 0 | 1;
  results: readonly CsvPlanItemDownloadResult[];
  summary: CsvDownloadSummary;
};

export type CsvDownloaderExecutionErrorResult = CsvDownloaderErrorResult & {
  exitCode: 1;
};

export type CsvDownloaderConfig = {
  years: readonly number[];
  force: boolean;
  // Restringe o plano a datasets específicos. Undefined baixa todos.
  datasets?: readonly string[];
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

export type CsvDownloadSummary = {
  downloaded: number;
  skipped: number;
  failed: number;
  failures: readonly CsvDownloadFailureSummary[];
};

export type CsvDownloadFailureSummary = {
  filename: string;
  reason: string;
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
      retryAfter?: string;
    };

export type CsvDownloadTransportOptions = {
  signal: AbortSignal;
};

export type CsvDownloadTransport = (
  url: string,
  options: CsvDownloadTransportOptions,
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
  inactivityTimeoutMs?: number;
  maxAttempts?: number;
  retryBackoffMs?: readonly number[];
  sleep?: (durationMs: number) => Promise<void>;
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

export type CsvDownloaderExecutionOptions = CsvDownloaderOptions & {
  downloadItem?: (
    item: CsvDownloadPlanItem,
    options: CsvPlanItemDownloaderOptions,
  ) => Promise<CsvPlanItemDownloadResult>;
  reporter?: CsvDownloaderReporter;
};

export type CsvDownloaderReporter = {
  log(message: string): void;
  error?(message: string): void;
};
