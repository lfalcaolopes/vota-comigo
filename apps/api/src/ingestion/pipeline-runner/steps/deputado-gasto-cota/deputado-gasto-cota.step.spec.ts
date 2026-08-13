import type { CsvRow } from '../../sources/csv-reader';
import { StrictModeError } from '../../errors/strict-mode-error';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

import { createDeputadoGastoCotaStep } from './deputado-gasto-cota.step';
import type {
  DeputadoGastoCotaRepository,
  ReplaceAnoInput,
} from './deputado-gasto-cota.repository.types';

function line(
  lineNumber: number,
  overrides: Partial<Record<string, string>> = {},
): CsvRow {
  return {
    lineNumber,
    record: {
      ideCadastro: '204379',
      numSubCota: '1',
      txtDescricao: 'MANUTENÇÃO DE ESCRITÓRIO',
      vlrLiquido: '100.00',
      vlrRestituicao: '',
      numMes: '3',
      numAno: '2024',
      sgUF: 'MG',
      ...overrides,
    },
  };
}

function createRepository(): DeputadoGastoCotaRepository & {
  replacements: ReplaceAnoInput[];
} {
  const replacements: ReplaceAnoInput[] = [];

  return {
    replacements,
    loadDeputadoIdByExternalId: () =>
      Promise.resolve(new Map([[204379, 'deputado-uuid']])),
    replaceAno(input) {
      replacements.push(input);
      return Promise.resolve({ inserted: input.rows.length });
    },
  };
}

function createContext(
  rows: readonly CsvRow[],
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'Ano-2024.csv',
    year: 2024,
    readRecords: () => rows,
    ...overrides,
  } as IngestionStepContext;
}

describe('passo de ingestao dos gastos da cota', () => {
  describe('when the annual file is consistent', () => {
    it('replaces the year with the aggregates and the derived coverage', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([
        line(2, { numMes: '3' }),
        line(3, { numMes: '7', vlrLiquido: '50.00' }),
      ]);

      // Act
      const result = await step.run(context);

      // Assert
      expect(repository.replacements).toEqual([
        {
          year: 2024,
          coveredThroughMonth: 7,
          rows: [
            {
              deputadoId: 'deputado-uuid',
              year: 2024,
              siglaUf: 'MG',
              gastosJson: { '3': { '1': 10000 }, '7': { '1': 5000 } },
            },
          ],
          categorias: [
            { externalNumSubCota: 1, descricao: 'MANUTENÇÃO DE ESCRITÓRIO' },
          ],
        },
      ]);
      expect(result).toMatchObject({ read: 2, inserted: 1, rejected: [] });
    });
  });

  describe('when the annual file carries the estado of the deputado', () => {
    it('persists the sgUF from the file with the year aggregates', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([
        line(2, { sgUF: 'BA' }),
        line(3, { numMes: '4', sgUF: 'BA' }),
      ]);

      // Act
      await step.run(context);

      // Assert
      expect(repository.replacements[0].rows).toEqual([
        {
          deputadoId: 'deputado-uuid',
          year: 2024,
          siglaUf: 'BA',
          gastosJson: { '3': { '1': 10000 }, '4': { '1': 10000 } },
        },
      ]);
    });
  });

  describe('when the run is a dry run', () => {
    it('reads the file without replacing anything', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([line(2)], { dryRun: true });

      // Act
      const result = await step.run(context);

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result).toMatchObject({ read: 1, inserted: 0 });
    });
  });

  describe('when a categoria code carries conflicting descriptions', () => {
    it('aborts the load without replacing the year', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([
        line(2, { numSubCota: '9', txtDescricao: 'PASSAGEM AÉREA' }),
        line(3, { numSubCota: '9', txtDescricao: 'OUTRA COISA' }),
      ]);

      // Act
      const run = step.run(context);

      // Assert
      await expect(run).rejects.toBeInstanceOf(StrictModeError);
      expect(repository.replacements).toEqual([]);
    });
  });

  describe('when an ideCadastro has no deputado in the product', () => {
    it('replaces the year and reports the gap in permissive mode', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([line(2), line(3, { ideCadastro: '99' })]);

      // Act
      const result = await step.run(context);

      // Assert
      expect(repository.replacements).toHaveLength(1);
      expect(result.externalGaps).toMatchObject([{ reference: '99' }]);
    });

    it('aborts without replacing the year in strict mode', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([line(2), line(3, { ideCadastro: '99' })], {
        strict: true,
      });

      // Act
      const run = step.run(context);

      // Assert
      await expect(run).rejects.toBeInstanceOf(StrictModeError);
      expect(repository.replacements).toEqual([]);
    });
  });

  describe('when the file has no usable record', () => {
    it('keeps the previously loaded year instead of wiping it', async () => {
      // Arrange
      const repository = createRepository();
      const step = createDeputadoGastoCotaStep(repository);
      const context = createContext([line(2, { ideCadastro: '' })]);

      // Act
      const result = await step.run(context);

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result.externalGaps).toMatchObject([{ type: 'fonte_vazia' }]);
    });
  });
});
