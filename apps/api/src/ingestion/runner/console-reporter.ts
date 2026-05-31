import type { IngestionReporter } from './ingestion-runner.types';

export type ConsoleReporterDeps = {
  write: (text: string) => void;
  errorWrite: (text: string) => void;
  isTty: boolean;
};

// Carriage return plus ESC[K rewrites the current line from its start.
const REWRITE_LINE = '\r\u001b[K';

export function createConsoleReporter(
  deps: ConsoleReporterDeps = defaultDeps(),
): IngestionReporter {
  // A live status line is written without a trailing newline; any other output
  // must break the line first so it is not glued onto the status text.
  let statusPending = false;

  function breakStatusLine(): void {
    if (statusPending) {
      deps.write('\n');
      statusPending = false;
    }
  }

  function line(write: (text: string) => void, message: string): void {
    breakStatusLine();
    write(`${message}\n`);
  }

  return {
    log(message) {
      line(deps.write, message);
    },
    error(message) {
      line(deps.errorWrite, message);
    },
    debug(message) {
      line(deps.write, message);
    },
    status(message) {
      if (!deps.isTty) {
        return;
      }

      deps.write(`${REWRITE_LINE}${message}`);
      statusPending = true;
    },
  };
}

function defaultDeps(): ConsoleReporterDeps {
  return {
    write: (text) => process.stdout.write(text),
    errorWrite: (text) => process.stderr.write(text),
    isTty: Boolean(process.stdout.isTTY),
  };
}
