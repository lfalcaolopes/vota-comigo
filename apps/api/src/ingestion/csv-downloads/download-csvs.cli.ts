import { executeCsvDownloader } from './csv-downloader';

void main();

async function main(): Promise<void> {
  const result = await executeCsvDownloader(process.argv.slice(2), {
    reporter: {
      log(message) {
        console.log(message);
      },
    },
  });

  if (!result.ok) {
    console.error(result.message);
  }

  process.exitCode = result.exitCode;
}
