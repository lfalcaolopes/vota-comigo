export type CsvDownloaderResult = {
  ok: true;
  message: string;
  args: readonly string[];
};

export function runCsvDownloader(args: readonly string[]): CsvDownloaderResult {
  const downloaderArgs = args[0] === '--' ? args.slice(1) : args;

  return {
    ok: true,
    message: 'Downloader de CSVs invocado com sucesso.',
    args: downloaderArgs,
  };
}
