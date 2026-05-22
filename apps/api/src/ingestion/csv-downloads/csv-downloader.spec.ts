import { resolveCsvDownloaderConfig } from './csv-downloader-config';
import { runCsvDownloader } from './csv-downloader';

describe('csv downloader entrypoint', () => {
  describe('when resolving configuration in isolation', () => {
    it('returns the temporal window and overwrite policy without invoking the downloader entrypoint', () => {
      // Arrange
      const args = ['--force', '--from=2024', '--to=2025'];

      // Act
      const resolution = resolveCsvDownloaderConfig(args, {
        currentYear: 2026,
      });

      // Assert
      expect(resolution).toEqual({
        ok: true,
        config: {
          force: true,
          years: [2024, 2025],
        },
      });
    });
  });

  describe('when invoked by the public command', () => {
    it('uses the full temporal window when no temporal flags are provided', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2003 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('returns a controlled success result', () => {
      // Arrange
      const args = ['--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2020, 2021, 2022, 2023, 2024, 2025],
        },
      });
    });

    it('resolves a window starting from a specific year', () => {
      // Arrange
      const args = ['--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2024, 2025, 2026],
        },
      });
    });

    it('resolves a window ending at a specific year', () => {
      // Arrange
      const args = ['--to=2003'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2001, 2002, 2003],
        },
      });
    });

    it('resolves explicit years before interval flags', () => {
      // Arrange
      const args = ['--from=2020', '--to=2026', '--years=2021,2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2021, 2024],
        },
      });
    });

    it('resolves the last five years including the current year', () => {
      // Arrange
      const args = ['--last=5'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('resolves the last ten years including the current year', () => {
      // Arrange
      const args = ['--last=10'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: false,
          years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        },
      });
    });

    it('combines force with a valid temporal window', () => {
      // Arrange
      const args = ['--force', '--years=2023,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: true,
        message: 'Downloader de CSVs invocado com sucesso.',
        args,
        config: {
          force: true,
          years: [2023, 2025],
        },
      });
    });

    it('ignores the pnpm argument separator', () => {
      // Arrange
      const args = ['--', '--from=2020', '--to=2025'];

      // Act
      const result = runCsvDownloader(args);

      // Assert
      expect(result.args).toEqual(['--from=2020', '--to=2025']);
    });
  });

  describe('when invoked with invalid configuration', () => {
    it('rejects last combined with explicit years', () => {
      // Arrange
      const args = ['--last=5', '--years=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval start', () => {
      // Arrange
      const args = ['--last=5', '--from=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects last combined with an interval end', () => {
      // Arrange
      const args = ['--last=5', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message:
          '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
        args,
      });
    });

    it('rejects unsupported last windows', () => {
      // Arrange
      const args = ['--last=3'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--last aceita apenas os valores 5 ou 10.',
        args,
      });
    });

    it('rejects years outside the valid range', () => {
      // Arrange
      const args = ['--years=2000,2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
    });

    it('rejects interval years outside the valid range', () => {
      // Arrange
      const args = ['--from=2000', '--to=2025'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: 'Ano 2000 inválido. Use anos entre 2001 e 2026.',
        args,
      });
    });

    it('rejects malformed year values', () => {
      // Arrange
      const args = ['--from=vinte'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve receber um ano no formato YYYY.',
        args,
      });
    });

    it('rejects reversed intervals', () => {
      // Arrange
      const args = ['--from=2025', '--to=2024'];

      // Act
      const result = runCsvDownloader(args, { currentYear: 2026 });

      // Assert
      expect(result).toEqual({
        ok: false,
        message: '--from deve ser menor ou igual a --to.',
        args,
      });
    });
  });
});
