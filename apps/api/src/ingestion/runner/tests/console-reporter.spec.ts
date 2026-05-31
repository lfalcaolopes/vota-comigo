import { createConsoleReporter } from '../console-reporter';
import type { ConsoleReporterDeps } from '../console-reporter';

// Carriage return + ESC[K: the sequence the reporter uses to rewrite a line.
const REWRITE = '\r\u001b[K';

function capture(isTty: boolean) {
  const out: string[] = [];
  const err: string[] = [];
  const deps: ConsoleReporterDeps = {
    write: (text) => out.push(text),
    errorWrite: (text) => err.push(text),
    isTty,
  };

  return { reporter: createConsoleReporter(deps), out, err };
}

describe('console reporter', () => {
  describe('when writing plain output', () => {
    it('sends log to stdout and error to stderr, each ending with a newline', () => {
      // Arrange
      const { reporter, out, err } = capture(true);

      // Act
      reporter.log('feito');
      reporter.error?.('quebrou');

      // Assert
      expect(out).toEqual(['feito\n']);
      expect(err).toEqual(['quebrou\n']);
    });
  });

  describe('when a live status line is active', () => {
    it('rewrites a single line in a TTY', () => {
      // Arrange
      const { reporter, out } = capture(true);

      // Act
      reporter.status?.('1/2');
      reporter.status?.('2/2');

      // Assert
      expect(out).toEqual([`${REWRITE}1/2`, `${REWRITE}2/2`]);
    });

    it('breaks the status line before printing other output so they do not glue together', () => {
      // Arrange
      const { reporter, out } = capture(true);

      // Act
      reporter.status?.('1/2');
      reporter.debug?.('[debug] item');

      // Assert
      expect(out).toEqual([`${REWRITE}1/2`, '\n', '[debug] item\n']);
    });
  });

  describe('when stdout is not a TTY', () => {
    it('stays silent on the status channel', () => {
      // Arrange
      const { reporter, out } = capture(false);

      // Act
      reporter.status?.('1/2');
      reporter.log('feito');

      // Assert
      expect(out).toEqual(['feito\n']);
    });
  });
});
