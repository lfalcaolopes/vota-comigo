import { runCsvDownloader } from './csv-downloader';

const result = runCsvDownloader(process.argv.slice(2));

console.log(result.message);
