import 'dotenv/config';

import { executeIngestionRunner } from './ingestion-runner';

void main();

async function main(): Promise<void> {
  const result = await executeIngestionRunner(process.argv.slice(2), {
    reporter: {
      log(message) {
        console.log(message);
      },
      error(message) {
        console.error(message);
      },
    },
  });

  process.exitCode = result.exitCode;
}
