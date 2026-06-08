import 'dotenv/config';

import { createConsoleReporter } from './reporting/console-reporter';
import { executeIngestionPipelineRunner } from './ingestion-pipeline-runner';

void main();

async function main(): Promise<void> {
  const result = await executeIngestionPipelineRunner(process.argv.slice(2), {
    reporter: createConsoleReporter(),
  });

  process.exitCode = result.exitCode;
}
