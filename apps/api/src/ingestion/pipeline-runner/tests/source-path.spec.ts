import { defaultSourcePath } from '../sources/source-path';

describe('caminho do arquivo de origem', () => {
  describe('when the dataset follows the dados abertos convention', () => {
    it('keeps the paths the pipeline already used', () => {
      // Arrange
      const entries = [
        { stepName: 'legislaturas', scope: 'single' as const },
        { stepName: 'deputados', scope: 'single' as const },
        {
          stepName: 'votacao_votos',
          scope: 'annual' as const,
          dataset: 'votacoesVotos',
          year: 2024,
        },
        { stepName: 'votacoes', scope: 'annual' as const, year: 2024 },
      ];

      // Act
      const paths = entries.map(defaultSourcePath);

      // Assert
      expect(paths).toEqual([
        'data/raw/legislaturas/legislaturas.csv',
        'data/raw/deputados/deputados.csv',
        'data/raw/votacoesVotos/votacoesVotos-2024.csv',
        'data/raw/votacoes/votacoes-2024.csv',
      ]);
    });
  });

  describe('when the dataset is scoped by legislatura', () => {
    it('builds the -L{legislatura} filename the downloader wrote to disk', () => {
      // Arrange
      const entry = {
        stepName: 'deputado_orgao',
        scope: 'single' as const,
        dataset: 'orgaosDeputados',
        legislatura: 57,
      };

      // Act
      const path = defaultSourcePath(entry);

      // Assert
      expect(path).toBe('data/raw/orgaosDeputados/orgaosDeputados-L57.csv');
    });
  });

  describe('when the dataset is the cota parlamentar file', () => {
    it('uses the filename convention the downloader wrote to disk', () => {
      // Arrange
      const entry = {
        stepName: 'deputado_gasto_cota',
        scope: 'annual' as const,
        dataset: 'ceap',
        year: 2024,
      };

      // Act
      const path = defaultSourcePath(entry);

      // Assert
      expect(path).toBe('data/raw/ceap/Ano-2024.csv');
    });
  });
});
