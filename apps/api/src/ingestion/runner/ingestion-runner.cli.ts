import 'dotenv/config';

import { createConsoleReporter } from './console-reporter';
import { executeIngestionRunner } from './ingestion-runner';

void main();

async function main(): Promise<void> {
  const result = await executeIngestionRunner(process.argv.slice(2), {
    reporter: createConsoleReporter(),
  });

  process.exitCode = result.exitCode;
}
