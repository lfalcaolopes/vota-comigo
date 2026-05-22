import { runCsvDownloader } from './csv-downloader';

describe('csv downloader entrypoint', () => {
  describe('when invoked by the public command', () => {
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
});
