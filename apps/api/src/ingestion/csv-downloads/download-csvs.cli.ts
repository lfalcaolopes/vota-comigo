import { runCsvDownloader } from './csv-downloader';

const result = runCsvDownloader(process.argv.slice(2));

if (!result.ok) {
  console.error(result.message);
  process.exitCode = 1;
} else {
  console.log(result.message);
}
