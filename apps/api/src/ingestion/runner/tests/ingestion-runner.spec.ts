import { Readable } from 'node:stream';

import { executeIngestionRunner } from '../ingestion-runner';
import { readCsvRecords } from '../csv-reader';
import { StrictModeError } from '../strict-mode-error';
import { createLegislaturasStep } from '../steps/legislaturas/legislaturas.step';
import type {
  LegislaturaRepository,
  LegislaturaRow,
  LegislaturaUpsertResult,
} from '../steps/legislaturas/legislaturas.repository.types';
import type {
  IngestionReporter,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../ingestion-runner.types';

function countingStep(name: string): IngestionStep {
  return {
    name,
    scope: 'annual',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      let read = 0;
      for await (const row of context.readRecords()) {
        void row;
        read += 1;
      }
      return {
        read,
        inserted: 0,
        updated: 0,
        ignored: 0,
        rejected: [],
        externalGaps: [],
      };
    },
  };
}

function createFakeRepository(): LegislaturaRepository & {
  readonly upserted: LegislaturaRow[];
} {
  const store = new Map<number, LegislaturaRow>();
  const upserted: LegislaturaRow[] = [];

  return {
    upserted,
    async upsert(rows): Promise<LegislaturaUpsertResult> {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        upserted.push(row);
        if (store.has(row.externalIdLegislatura)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.set(row.externalIdLegislatura, row);
      }

      return { inserted, updated };
    },
  };
}

function createReporter(): IngestionReporter & { readonly lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    log(message) {
      lines.push(message);
    },
  };
}

const legislaturasCsv = [
  'idLegislatura;uri;dataInicio;dataFim;anoEleicao',
  '57;https://example/57;2023-02-01;2027-01-31;2022',
  '56;https://example/56;2019-02-01;2023-01-31;2018',
].join('\n');

describe('ingestion runner', () => {
  describe('when ingesting legislaturas end to end', () => {
    it('runs the planned step and reports an aggregated summary with a zero exit code', async () => {
      // Arrange
      const repository = createFakeRepository();
      const reporter = createReporter();

      // Act
      const result = await executeIngestionRunner(['--only=legislaturas'], {
        currentYear: 2026,
        csvReader: readCsvRecords,
        openSource: () => Readable.from(legislaturasCsv),
        createSteps: async () => ({
          steps: [createLegislaturasStep(repository)],
          close: async () => {},
        }),
        reporter,
      });

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(0);
      expect(result.summary).toMatchObject({
        totalRead: 2,
        totalInserted: 2,
        totalUpdated: 0,
        totalRejected: 0,
      });
      expect(result.summary.steps).toEqual([
        expect.objectContaining({
          stepName: 'legislaturas',
          read: 2,
          inserted: 2,
        }),
      ]);
      expect(repository.upserted).toHaveLength(2);
    });
  });

  describe('when some rows are rejected', () => {
    it('writes a JSONL error file and cites its path in the summary', async () => {
      // Arrange
      const repository = createFakeRepository();
      const writes: { path: string; content: string }[] = [];
      const csv = [
        'idLegislatura;uri',
        'abc;https://example/x',
        '57;https://example/57',
      ].join('\n');

      // Act
      const result = await executeIngestionRunner(['--only=legislaturas'], {
        currentYear: 2026,
        csvReader: readCsvRecords,
        openSource: () => Readable.from(csv),
        createSteps: async () => ({
          steps: [createLegislaturasStep(repository)],
          close: async () => {},
        }),
        errorLog: {
          fileSystem: {
            async mkdir() {},
            async writeFile(path, content) {
              writes.push({ path, content });
            },
          },
          now: () => new Date('2026-05-30T12:00:00.000Z'),
        },
      });

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.summary.totalRejected).toBe(1);
      expect(result.summary.errorLogPath).toBe(
        'data/logs/errors/errors-2026-05-30T12-00-00-000Z.log',
      );
      expect(writes).toHaveLength(1);
      expect(writes[0].content).toContain('validacao_id_invalido');
    });
  });

  describe('when no rows are rejected', () => {
    it('does not write an error file', async () => {
      // Arrange
      const repository = createFakeRepository();
      let wrote = false;

      // Act
      const result = await executeIngestionRunner(['--only=legislaturas'], {
        currentYear: 2026,
        csvReader: readCsvRecords,
        openSource: () => Readable.from(legislaturasCsv),
        createSteps: async () => ({
          steps: [createLegislaturasStep(repository)],
          close: async () => {},
        }),
        errorLog: {
          fileSystem: {
            async mkdir() {},
            async writeFile() {
              wrote = true;
            },
          },
          now: () => new Date('2026-05-30T12:00:00.000Z'),
        },
      });

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.summary.errorLogPath).toBeUndefined();
      expect(wrote).toBe(false);
    });
  });

  describe('when a step reports external gaps', () => {
    it('writes a JSONL gap file and cites its path in the summary', async () => {
      // Arrange
      const writes: { path: string; content: string }[] = [];
      const gappyStep: IngestionStep = {
        name: 'legislaturas',
        scope: 'single',
        async run(): Promise<StepRunResult> {
          return {
            read: 0,
            inserted: 0,
            updated: 0,
            ignored: 0,
            rejected: [],
            externalGaps: [
              {
                file: 'deputado_historico',
                type: 'fonte_externa_indisponivel',
                reference: '999999',
                message:
                  'Histórico indisponível para o deputado 999999: 503 Service Unavailable.',
              },
            ],
          };
        },
      };

      // Act
      const result = await executeIngestionRunner(['--only=legislaturas'], {
        currentYear: 2026,
        openSource: () => Readable.from('x'),
        createSteps: async () => ({
          steps: [gappyStep],
          close: async () => {},
        }),
        errorLog: {
          fileSystem: {
            async mkdir() {},
            async writeFile(path, content) {
              writes.push({ path, content });
            },
          },
          now: () => new Date('2026-05-30T12:00:00.000Z'),
        },
      });

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.summary.totalRejected).toBe(0);
      expect(result.summary.errorLogPath).toBeUndefined();
      expect(result.summary.gapLogPath).toBe(
        'data/logs/gaps/gaps-2026-05-30T12-00-00-000Z.log',
      );
      expect(writes).toHaveLength(1);
      expect(writes[0].content).toContain('999999');
      expect(writes[0].content).toContain('fonte_externa_indisponivel');
    });
  });

  describe('when strict mode aborts on a bad row', () => {
    it('stops the run, flags the summary as aborted and exits with code 1', async () => {
      // Arrange
      const repository = createFakeRepository();
      const csv = ['idLegislatura;uri', 'abc;https://example/x'].join('\n');

      // Act
      const result = await executeIngestionRunner(
        ['--only=legislaturas', '--strict'],
        {
          currentYear: 2026,
          csvReader: readCsvRecords,
          openSource: () => Readable.from(csv),
          createSteps: async () => ({
            steps: [createLegislaturasStep(repository)],
            close: async () => {},
          }),
          errorLog: {
            fileSystem: { async mkdir() {}, async writeFile() {} },
            now: () => new Date('2026-05-30T12:00:00.000Z'),
          },
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(1);
      expect(result.summary.aborted).toBe(true);
    });
  });

  describe('when an annual source file is missing', () => {
    it('skips the missing year as a source gap, runs the present year, and keeps a zero exit code', async () => {
      // Arrange
      const reporter = createReporter();
      const presentYearCsv = ['idVotacao;voto', '1-1;Sim'].join('\n');

      // Act
      const result = await executeIngestionRunner(
        ['--from=2020', '--to=2021'],
        {
          currentYear: 2021,
          stepDescriptors: [
            { name: 'votos', scope: 'annual', dataset: 'votacoesVotos' },
          ],
          csvReader: readCsvRecords,
          sourceExists: (path) => !path.includes('2020'),
          openSource: () => Readable.from(presentYearCsv),
          createSteps: async () => ({
            steps: [countingStep('votos')],
            close: async () => {},
          }),
          reporter,
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(0);
      expect(result.summary.aborted).toBeFalsy();
      expect(result.summary.totalExternalGaps).toBe(1);
      expect(result.summary.steps).toEqual([
        expect.objectContaining({
          stepName: 'votos',
          year: 2020,
          read: 0,
          externalGaps: [expect.objectContaining({ type: 'fonte_ausente' })],
        }),
        expect.objectContaining({ stepName: 'votos', year: 2021, read: 1 }),
      ]);
    });
  });

  describe('when a required single-file source is missing', () => {
    it('aborts the run and exits with code 1', async () => {
      // Arrange
      const repository = createFakeRepository();

      // Act
      const result = await executeIngestionRunner(['--only=legislaturas'], {
        currentYear: 2026,
        csvReader: readCsvRecords,
        sourceExists: () => false,
        openSource: () => Readable.from(''),
        createSteps: async () => ({
          steps: [createLegislaturasStep(repository)],
          close: async () => {},
        }),
        errorLog: {
          fileSystem: { async mkdir() {}, async writeFile() {} },
          now: () => new Date('2026-05-30T12:00:00.000Z'),
        },
      });

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(1);
      expect(result.summary.aborted).toBe(true);
      expect(result.summary.totalExternalGaps).toBe(1);
    });
  });

  describe('when --only references an unknown step', () => {
    it('does not run and exits with code 1 listing the valid steps', async () => {
      // Arrange
      let createStepsCalled = false;

      // Act
      const result = await executeIngestionRunner(['--only=votacoes'], {
        currentYear: 2026,
        createSteps: async () => {
          createStepsCalled = true;
          return { steps: [], close: async () => {} };
        },
      });

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('expected a failed execution');
      }
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('legislaturas');
      expect(createStepsCalled).toBe(false);
    });
  });

  describe('when a step is sourced from the API', () => {
    it('runs the step without requiring a CSV source file', async () => {
      // Arrange
      const apiStep: IngestionStep = {
        name: 'deputado_historico',
        scope: 'single',
        source: 'api',
        async run() {
          return {
            read: 3,
            inserted: 2,
            updated: 1,
            ignored: 0,
            rejected: [],
            externalGaps: [
              {
                file: 'deputado_historico',
                type: 'fonte_externa_indisponivel',
                reference: '999999',
                message: 'indisponível',
              },
            ],
          };
        },
      };

      // Act
      const result = await executeIngestionRunner(
        ['--only=deputado_historico'],
        {
          currentYear: 2026,
          stepDescriptors: [
            { name: 'deputado_historico', scope: 'single', source: 'api' },
          ],
          sourceExists: () => false,
          createSteps: async () => ({
            steps: [apiStep],
            close: async () => {},
          }),
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(0);
      expect(result.summary.aborted).toBeFalsy();
      expect(result.summary.totalExternalGaps).toBe(1);
      expect(result.summary.steps).toEqual([
        expect.objectContaining({
          stepName: 'deputado_historico',
          read: 3,
          inserted: 2,
        }),
      ]);
    });

    it('aborts with exit code 1 when an API step raises a strict gap', async () => {
      // Arrange
      const apiStep: IngestionStep = {
        name: 'deputado_historico',
        scope: 'single',
        source: 'api',
        async run() {
          throw StrictModeError.fromGap({
            file: 'deputado_historico',
            type: 'fonte_externa_indisponivel',
            reference: '999999',
            message: 'indisponível',
          });
        },
      };

      // Act
      const result = await executeIngestionRunner(
        ['--only=deputado_historico', '--strict'],
        {
          currentYear: 2026,
          stepDescriptors: [
            { name: 'deputado_historico', scope: 'single', source: 'api' },
          ],
          sourceExists: () => false,
          createSteps: async () => ({
            steps: [apiStep],
            close: async () => {},
          }),
          errorLog: {
            fileSystem: { async mkdir() {}, async writeFile() {} },
            now: () => new Date('2026-05-30T12:00:00.000Z'),
          },
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.exitCode).toBe(1);
      expect(result.summary.aborted).toBe(true);
      expect(result.summary.totalExternalGaps).toBe(1);
    });
  });

  describe('when running in dry-run mode', () => {
    it('asks the step provider for dry-run dependencies and writes nothing', async () => {
      // Arrange
      const repository = createFakeRepository();
      let receivedDryRun: boolean | undefined;

      // Act
      const result = await executeIngestionRunner(
        ['--only=legislaturas', '--dry-run'],
        {
          currentYear: 2026,
          csvReader: readCsvRecords,
          openSource: () => Readable.from(legislaturasCsv),
          createSteps: async (input) => {
            receivedDryRun = input.dryRun;
            return {
              steps: [createLegislaturasStep(repository)],
              close: async () => {},
            };
          },
        },
      );

      // Assert
      expect(receivedDryRun).toBe(true);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.message);
      }
      expect(result.summary).toMatchObject({ dryRun: true, totalInserted: 0 });
      expect(repository.upserted).toEqual([]);
    });
  });
});
