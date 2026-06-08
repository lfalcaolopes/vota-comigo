import { Readable } from 'node:stream';

import {
  createIngestionStepExecutor,
  type IngestionStepExecutorDeps,
} from '../composition/ingestion-step-executor';
import { StrictModeError } from '../errors/strict-mode-error';
import type { CsvReader } from '../sources/csv-reader';
import { defaultSourcePath } from '../sources/source-path';
import type {
  ExternalGap,
  IngestionReporter,
  IngestionPipelineRunnerConfig,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../types/ingestion-pipeline-runner.types';

function emptyResult(overrides: Partial<StepRunResult> = {}): StepRunResult {
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

function baseConfig(overrides: Partial<IngestionPipelineRunnerConfig> = {}) {
  return {
    years: [2024, 2025],
    dryRun: false,
    strict: false,
    debug: false,
    refetchHistorico: false,
    ...overrides,
  };
}

function createReporter(): IngestionReporter & { readonly lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    log(message) {
      lines.push(message);
    },
    error(message) {
      lines.push(`error: ${message}`);
    },
  };
}

function createDeps(
  overrides: Partial<IngestionStepExecutorDeps> = {},
): IngestionStepExecutorDeps & { readonly opened: string[] } {
  const opened: string[] = [];
  const csvReader: CsvReader = async function* () {
    yield { lineNumber: 1, record: { id: '1' } };
  };

  return {
    opened,
    config: baseConfig(),
    csvReader,
    openSource(path) {
      opened.push(path);
      return Readable.from(path);
    },
    sourceExists: () => true,
    sourcePathFor(entry) {
      const dataset = entry.dataset ?? entry.stepName;
      const suffix = entry.scope === 'annual' ? `-${entry.year}` : '';

      return `data/raw/${dataset}/${dataset}${suffix}.csv`;
    },
    ...overrides,
  };
}

describe('ingestion step executor', () => {
  describe('when executing non-CSV steps', () => {
    it.each(['api', 'db'] as const)(
      'provides a guarded readRecords for %s steps',
      async (source) => {
        // Arrange
        const step: IngestionStep = {
          name: source === 'api' ? 'deputado_historico' : 'sanity',
          scope: 'single',
          source,
          async run(context: IngestionStepContext) {
            expect(context.sourceFile).toBe(step.name);
            expect(() => context.readRecords()).toThrow(
              'Passo de origem API não consome registros CSV.',
            );

            return emptyResult({ read: 1 });
          },
        };
        const executor = createIngestionStepExecutor(createDeps());

        // Act
        const result = await executor.execute(
          { stepName: step.name, scope: 'single' },
          step,
        );

        // Assert
        expect(result.aborted).toBe(false);
        expect(result.summary).toEqual(
          expect.objectContaining({
            stepName: step.name,
            read: 1,
          }),
        );
      },
    );
  });

  describe('when executing derived steps', () => {
    it('provides scoped years and opens arbitrary annual datasets', async () => {
      // Arrange
      const deps = createDeps({
        sourceExists: (path) => path.includes('votacoesVotos-2024'),
      });
      const step: IngestionStep = {
        name: 'proposicoes',
        scope: 'single',
        source: 'derived',
        async run(context) {
          expect(context.years).toEqual([2024, 2025]);
          expect(context.readDataset?.('votacoesVotos', 2025)).toBeUndefined();

          const source = context.readDataset?.('votacoesVotos', 2024);
          expect(source).toBeDefined();

          let read = 0;
          for await (const row of source!()) {
            expect(row.record).toEqual({ id: '1' });
            read += 1;
          }

          return emptyResult({ read });
        },
      };
      const executor = createIngestionStepExecutor(deps);

      // Act
      const result = await executor.execute(
        { stepName: 'proposicoes', scope: 'single' },
        step,
      );

      // Assert
      expect(result.summary).toEqual(
        expect.objectContaining({ stepName: 'proposicoes', read: 1 }),
      );
      expect(deps.opened).toEqual([
        'data/raw/votacoesVotos/votacoesVotos-2024.csv',
      ]);
    });
  });

  describe('when executing CSV steps', () => {
    it('provides primary and companion sources when they exist', async () => {
      // Arrange
      const reporter = createReporter();
      const deps = createDeps({
        reporter,
        sourceExists: (path) => !path.includes('missingDataset'),
      });
      const step: IngestionStep = {
        name: 'votacoes',
        scope: 'annual',
        companionDatasets: ['votacoesVotos'],
        async run(context) {
          expect(context.sourceFile).toBe('votacoes-2024.csv');
          expect(context.year).toBe(2024);
          expect(context.readCompanion?.('missingDataset')).toBeUndefined();

          const companion = context.readCompanion?.('votacoesVotos');
          expect(companion).toBeDefined();

          let read = 0;
          for await (const row of context.readRecords()) {
            expect(row.record).toEqual({ id: '1' });
            read += 1;
          }
          for await (const row of companion!()) {
            expect(row.record).toEqual({ id: '1' });
            read += 1;
          }

          return emptyResult({ read });
        },
      };
      const executor = createIngestionStepExecutor(deps);

      // Act
      const result = await executor.execute(
        { stepName: 'votacoes', scope: 'annual', year: 2024 },
        step,
      );

      // Assert
      expect(result.summary).toEqual(
        expect.objectContaining({ stepName: 'votacoes', year: 2024, read: 2 }),
      );
      expect(reporter.lines).toEqual([
        '[votacoes 2024] iniciando (votacoes-2024.csv)',
        expect.stringContaining('[votacoes 2024] lidos 2'),
      ]);
    });

    it('returns a non-aborting gap summary for a missing annual source in normal mode', async () => {
      // Arrange
      const reporter = createReporter();
      const executor = createIngestionStepExecutor(
        createDeps({ reporter, sourceExists: () => false }),
      );
      const step: IngestionStep = {
        name: 'votacoes',
        scope: 'annual',
        async run() {
          throw new Error('Step should not run.');
        },
      };

      // Act
      const result = await executor.execute(
        { stepName: 'votacoes', scope: 'annual', year: 2024 },
        step,
      );

      // Assert
      expect(result.aborted).toBe(false);
      expect(result.externalGaps).toEqual([
        expect.objectContaining({
          file: 'votacoes-2024.csv',
          type: 'fonte_ausente',
        }),
      ]);
      expect(result.summary).toEqual(
        expect.objectContaining({
          stepName: 'votacoes',
          year: 2024,
          read: 0,
          externalGaps: result.externalGaps,
        }),
      );
      expect(reporter.lines).toEqual([
        '[votacoes 2024] fonte ausente: data/raw/votacoes/votacoes-2024.csv (passo ignorado)',
      ]);
    });

    it('aborts when a missing primary source is strict or single scope', async () => {
      // Arrange
      const strictExecutor = createIngestionStepExecutor(
        createDeps({
          config: baseConfig({ strict: true }),
          sourceExists: () => false,
        }),
      );
      const singleExecutor = createIngestionStepExecutor(
        createDeps({ sourceExists: () => false }),
      );
      const annualStep: IngestionStep = {
        name: 'votacoes',
        scope: 'annual',
        async run() {
          throw new Error('Step should not run.');
        },
      };
      const singleStep: IngestionStep = {
        name: 'legislaturas',
        scope: 'single',
        async run() {
          throw new Error('Step should not run.');
        },
      };

      // Act
      const strictResult = await strictExecutor.execute(
        { stepName: 'votacoes', scope: 'annual', year: 2024 },
        annualStep,
      );
      const singleResult = await singleExecutor.execute(
        { stepName: 'legislaturas', scope: 'single' },
        singleStep,
      );

      // Assert
      expect(strictResult.aborted).toBe(true);
      expect(singleResult.aborted).toBe(true);
    });
  });

  describe('when the step fails', () => {
    it('flattens strict mode rejection and gap aborts', async () => {
      // Arrange
      const rejection: Rejection = {
        file: 'legislaturas.csv',
        line: 2,
        type: 'validacao_id_invalido',
        fields: {},
        message: 'ID inválido.',
      };
      const gap: ExternalGap = {
        file: 'deputado_historico',
        type: 'fonte_externa_indisponivel',
        reference: '1',
        message: 'Fonte externa indisponível.',
      };
      const executor = createIngestionStepExecutor(createDeps());

      // Act
      const rejectionResult = await executor.execute(
        { stepName: 'legislaturas', scope: 'single' },
        {
          name: 'legislaturas',
          scope: 'single',
          async run() {
            throw new StrictModeError(rejection);
          },
        },
      );
      const gapResult = await executor.execute(
        { stepName: 'deputado_historico', scope: 'single' },
        {
          name: 'deputado_historico',
          scope: 'single',
          source: 'api',
          async run() {
            throw StrictModeError.fromGap(gap);
          },
        },
      );

      // Assert
      expect(rejectionResult).toMatchObject({
        aborted: true,
        rejections: [rejection],
        externalGaps: [],
      });
      expect(gapResult).toMatchObject({
        aborted: true,
        rejections: [],
        externalGaps: [gap],
      });
    });

    it('lets regular errors escape', async () => {
      // Arrange
      const executor = createIngestionStepExecutor(createDeps());
      const step: IngestionStep = {
        name: 'legislaturas',
        scope: 'single',
        async run() {
          throw new Error('Unexpected failure.');
        },
      };

      // Act / Assert
      await expect(
        executor.execute({ stepName: 'legislaturas', scope: 'single' }, step),
      ).rejects.toThrow('Unexpected failure.');
    });
  });

  describe('source path', () => {
    it('preserves the default raw CSV paths', () => {
      // Arrange / Act / Assert
      expect(
        defaultSourcePath({ stepName: 'legislaturas', scope: 'single' }),
      ).toBe('data/raw/legislaturas/legislaturas.csv');
      expect(
        defaultSourcePath({
          stepName: 'votacao_votos',
          scope: 'annual',
          dataset: 'votacoesVotos',
          year: 2024,
        }),
      ).toBe('data/raw/votacoesVotos/votacoesVotos-2024.csv');
    });
  });
});
