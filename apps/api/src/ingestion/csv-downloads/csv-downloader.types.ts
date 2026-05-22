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
