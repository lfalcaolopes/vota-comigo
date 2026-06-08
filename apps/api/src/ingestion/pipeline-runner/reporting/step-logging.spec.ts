import {
  createProgressLogger,
  logStepGap,
  logStepResult,
  logStepStart,
  stepLabel,
} from './step-logging';
import type {
  IngestionReporter,
  StepRunResult,
} from '../types/ingestion-pipeline-runner.types';

function createReporter(): IngestionReporter & { readonly lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    log(message) {
      lines.push(message);
    },
  };
}

function result(overrides: Partial<StepRunResult> = {}): StepRunResult {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
    ...overrides,
  };
}

describe('step logging', () => {
  describe('stepLabel', () => {
    it('keeps the bare step name when there is no year', () => {
      // Arrange / Act / Assert
      expect(stepLabel('legislaturas')).toBe('legislaturas');
    });

    it('appends the year for annual steps', () => {
      // Arrange / Act / Assert
      expect(stepLabel('votacoes', 2024)).toBe('votacoes 2024');
    });
  });

  describe('logStepStart', () => {
    it('announces the step with its source description', () => {
      // Arrange
      const reporter = createReporter();

      // Act
      logStepStart(reporter, 'votacoes 2024', 'votacoes-2024.csv');

      // Assert
      expect(reporter.lines).toEqual([
        '[votacoes 2024] iniciando (votacoes-2024.csv)',
      ]);
    });

    it('omits the source suffix when none is given', () => {
      // Arrange
      const reporter = createReporter();

      // Act
      logStepStart(reporter, 'deputado_historico');

      // Assert
      expect(reporter.lines).toEqual(['[deputado_historico] iniciando']);
    });
  });

  describe('logStepResult', () => {
    it('reports reads, writes, ignores, rejects and duration', () => {
      // Arrange
      const reporter = createReporter();

      // Act
      logStepResult(
        reporter,
        'legislaturas',
        result({ read: 2, inserted: 2, updated: 0, ignored: 0 }),
        12.7,
      );

      // Assert
      expect(reporter.lines).toEqual([
        '[legislaturas] lidos 2, inseridos 2, atualizados 0, ignorados 0, rejeitados 0 (13ms)',
      ]);
    });
  });

  describe('logStepGap', () => {
    it('reports the skipped step and its missing references', () => {
      // Arrange
      const reporter = createReporter();

      // Act
      logStepGap(reporter, 'votos 2020', [
        'data/raw/votacoesVotos/votacoesVotos-2020.csv',
      ]);

      // Assert
      expect(reporter.lines).toEqual([
        '[votos 2020] fonte ausente: data/raw/votacoesVotos/votacoesVotos-2020.csv (passo ignorado)',
      ]);
    });
  });

  describe('createProgressLogger', () => {
    describe('when processing crosses the interval', () => {
      it('emits a progress line at each interval boundary', () => {
        // Arrange
        const reporter = createReporter();
        const progress = createProgressLogger(reporter, 'votacao_votos 2024', {
          interval: 100,
        });

        // Act
        for (let processed = 1; processed <= 250; processed += 1) {
          progress.tick(processed);
        }

        // Assert
        expect(reporter.lines).toEqual([
          '[votacao_votos 2024] 100 registros processados…',
          '[votacao_votos 2024] 200 registros processados…',
        ]);
      });

      it('closes with a final line summarising the read total', () => {
        // Arrange
        const reporter = createReporter();
        const progress = createProgressLogger(reporter, 'votacao_votos 2024', {
          interval: 100,
        });

        // Act
        for (let processed = 1; processed <= 250; processed += 1) {
          progress.tick(processed);
        }
        progress.done(250);

        // Assert
        expect(reporter.lines).toContain(
          '[votacao_votos 2024] leitura concluída: 250 registros',
        );
      });
    });

    describe('when the volume never reaches the interval', () => {
      it('stays silent so it does not duplicate the step summary', () => {
        // Arrange
        const reporter = createReporter();
        const progress = createProgressLogger(reporter, 'legislaturas', {
          interval: 5000,
        });

        // Act
        for (let processed = 1; processed <= 3; processed += 1) {
          progress.tick(processed);
        }
        progress.done(3);

        // Assert
        expect(reporter.lines).toEqual([]);
      });
    });
  });
});
