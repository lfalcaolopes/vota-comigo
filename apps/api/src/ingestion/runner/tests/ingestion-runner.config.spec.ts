import { resolveIngestionRunnerConfig } from '../ingestion-runner.config';

describe('ingestion runner config', () => {
  describe('when every flag is provided', () => {
    it('resolves the selected steps, temporal window, dry-run and strict mode', () => {
      // Arrange
      const args = [
        '--only=legislaturas',
        '--from=2024',
        '--to=2025',
        '--dry-run',
        '--strict',
        '--debug',
        '--limit=5',
      ];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
        stepNames: ['legislaturas'],
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          only: ['legislaturas'],
          years: [2024, 2025],
          dryRun: true,
          strict: true,
          debug: true,
          refetchHistorico: false,
          limit: 5,
        },
      });
    });
  });

  describe('when no flags are provided', () => {
    it('runs every step over the full temporal window without dry-run or strict mode', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2003,
        stepNames: ['legislaturas'],
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          only: undefined,
          years: [2001, 2002, 2003],
          dryRun: false,
          strict: false,
          debug: false,
          refetchHistorico: false,
          limit: undefined,
        },
      });
    });
  });

  describe('when --limit is not a positive integer', () => {
    it('aborts because --limit is invalid', () => {
      // Arrange
      const args = ['--limit=0'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: false,
        message: '--limit deve receber um inteiro positivo.',
      });
    });
  });

  describe('when --only references an unknown step', () => {
    it('aborts and lists the valid steps', () => {
      // Arrange
      const args = ['--only=votacoes'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        stepNames: ['legislaturas'],
      });

      // Assert
      expect(resolution.ok).toBe(false);
      if (resolution.ok) {
        throw new Error('expected an invalid resolution');
      }
      expect(resolution.message).toContain('votacoes');
      expect(resolution.message).toContain('legislaturas');
    });
  });

  describe('when --refetch-historico is provided', () => {
    it('flags a full re-fetch instead of resuming only pending deputados', () => {
      // Arrange
      const args = ['--refetch-historico'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
        stepNames: ['deputado_historico'],
      });

      // Assert
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) {
        throw new Error('expected a valid resolution');
      }
      expect(resolution.config.refetchHistorico).toBe(true);
    });

    it('defaults to resuming only pending deputados when absent', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
        stepNames: ['deputado_historico'],
      });

      // Assert
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) {
        throw new Error('expected a valid resolution');
      }
      expect(resolution.config.refetchHistorico).toBe(false);
    });
  });

  describe('when --retry-gaps is provided', () => {
    it('records the gap log path and restricts the run to deputado_historico', () => {
      // Arrange
      const args = ['--retry-gaps=data/logs/gaps/gaps.log'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
        stepNames: ['deputado_historico'],
      });

      // Assert
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) {
        throw new Error('expected a valid resolution');
      }
      expect(resolution.config.only).toEqual(['deputado_historico']);
      expect(resolution.config.retryGapsPath).toBe('data/logs/gaps/gaps.log');
    });

    it('rejects combining --retry-gaps with --only of another step', () => {
      // Arrange
      const args = ['--retry-gaps=gaps.log', '--only=legislaturas'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
        stepNames: ['legislaturas', 'deputado_historico'],
      });

      // Assert
      expect(resolution.ok).toBe(false);
      if (resolution.ok) {
        throw new Error('expected an invalid resolution');
      }
      expect(resolution.message).toContain('--retry-gaps');
    });
  });

  describe('when the temporal window is inverted', () => {
    it('aborts because --from is greater than --to', () => {
      // Arrange
      const args = ['--from=2025', '--to=2024'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: false,
        message: '--from deve ser menor ou igual a --to.',
      });
    });
  });

  describe('when a temporal bound falls outside the available CSV years', () => {
    it('aborts because the year is out of range', () => {
      // Arrange
      const args = ['--from=1999'];

      // Act
      const resolution = resolveIngestionRunnerConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution.ok).toBe(false);
      if (resolution.ok) {
        throw new Error('expected an invalid resolution');
      }
      expect(resolution.message).toContain('1999');
    });
  });
});
