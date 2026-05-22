export type CsvDownloaderResult =
  | CsvDownloaderSuccessResult
  | CsvDownloaderErrorResult;

export type CsvDownloaderSuccessResult = {
  ok: true;
  message: string;
  args: readonly string[];
  config: CsvDownloaderConfig;
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
  currentYear?: number;
};
