import { readGapLog, selectRetryReferences } from '../logs/gap-log-reader';
import type { GapLogReaderFileSystem } from '../logs/gap-log-reader';
import type { ExternalGap } from '../types/ingestion-pipeline-runner.types';

function fileSystemReturning(content: string): GapLogReaderFileSystem {
  return {
    async readFile() {
      return content;
    },
  };
}

function gap(overrides: Partial<ExternalGap> = {}): ExternalGap {
  return {
    file: 'deputado_historico',
    type: 'fonte_externa_indisponivel',
    reference: '220582',
    message:
      'Histórico indisponível para o deputado 220582: 503 tempo limite de 15000ms excedido.',
    ...overrides,
  };
}

describe('gap log reader', () => {
  describe('when parsing a JSONL gap log', () => {
    it('parses each valid line into an ExternalGap', async () => {
      // Arrange
      const content = [JSON.stringify(gap()), JSON.stringify(gap())].join('\n');
      const fileSystem = fileSystemReturning(content);

      // Act
      const gaps = await readGapLog('any.log', fileSystem);

      // Assert
      expect(gaps).toHaveLength(2);
      expect(gaps[0]).toEqual(gap());
    });

    it('ignores blank and malformed lines', async () => {
      // Arrange
      const content = [
        JSON.stringify(gap()),
        '',
        '   ',
        '{not valid json',
        '"a string, not an object"',
        '{"file":"x"}',
      ].join('\n');
      const fileSystem = fileSystemReturning(content);

      // Act
      const gaps = await readGapLog('any.log', fileSystem);

      // Assert
      expect(gaps).toHaveLength(1);
    });
  });

  describe('when selecting references to retry', () => {
    it('keeps deputado_historico external-source gaps and converts the reference to a number', () => {
      // Arrange
      const gaps = [gap({ reference: '220582' }), gap({ reference: '73768' })];

      // Act
      const references = selectRetryReferences(gaps);

      // Assert
      expect(references).toEqual([220582, 73768]);
    });

    it('drops missing-source gaps and gaps from other files', () => {
      // Arrange
      const gaps = [
        gap({ reference: '220582' }),
        gap({ type: 'fonte_ausente', reference: 'data/raw/x.csv' }),
        gap({ file: 'votacoesVotos-2020.csv', reference: '999' }),
      ];

      // Act
      const references = selectRetryReferences(gaps);

      // Assert
      expect(references).toEqual([220582]);
    });

    it('deduplicates repeated references', () => {
      // Arrange
      const gaps = [gap({ reference: '220582' }), gap({ reference: '220582' })];

      // Act
      const references = selectRetryReferences(gaps);

      // Assert
      expect(references).toEqual([220582]);
    });

    it('discards references that are not integers', () => {
      // Arrange
      const gaps = [gap({ reference: 'abc' }), gap({ reference: '220582' })];

      // Act
      const references = selectRetryReferences(gaps);

      // Assert
      expect(references).toEqual([220582]);
    });
  });
});
