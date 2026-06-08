import {
  createSanityStep,
  SANITY_PLACAR_DIVERGENTE,
  SANITY_VOTOS_AUSENTES,
} from './sanity.step';
import type {
  PlacarComparisonRow,
  SanityRepository,
} from './sanity.repository.types';
import type {
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

function comparisonRow(
  overrides: Partial<PlacarComparisonRow> = {},
): PlacarComparisonRow {
  return {
    externalIdVotacao: '2265603-43',
    votosSimOficial: 300,
    votosNaoOficial: 100,
    votosSimDerivado: 300,
    votosNaoDerivado: 100,
    outrosDerivado: {
      abstencao: 0,
      obstrucao: 0,
      artigo17: 0,
      naoInformado: 0,
    },
    ...overrides,
  };
}

function createFakeRepository(
  placares: readonly PlacarComparisonRow[],
): SanityRepository & { calls: number } {
  const repository = {
    calls: 0,
    async loadPlacares(): Promise<readonly PlacarComparisonRow[]> {
      repository.calls += 1;
      return placares;
    },
  };

  return repository;
}

function context(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'sanity',
    readRecords: () => {
      throw new Error('sanity não consome CSV');
    },
    ...overrides,
  };
}

async function runStep(
  placares: readonly PlacarComparisonRow[],
  overrides: Partial<IngestionStepContext> = {},
): Promise<StepRunResult> {
  const step = createSanityStep(createFakeRepository(placares));
  return step.run(context(overrides));
}

describe('sanity step', () => {
  describe('when official and derived tallies match', () => {
    it('reads every votação and reports no rejections', async () => {
      // Arrange
      const placares = [
        comparisonRow(),
        comparisonRow({ externalIdVotacao: 'x' }),
      ];

      // Act
      const result = await runStep(placares);

      // Assert
      expect(result).toMatchObject({ read: 2, rejected: [], ignored: 0 });
    });
  });

  describe('when a votação diverges', () => {
    it('rejects it with the divergence type and both tallies', async () => {
      // Arrange
      const placares = [
        comparisonRow(),
        comparisonRow({
          externalIdVotacao: '999-1',
          votosSimOficial: 300,
          votosSimDerivado: 290,
        }),
      ];

      // Act
      const result = await runStep(placares);

      // Assert
      expect(result.read).toBe(2);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: SANITY_PLACAR_DIVERGENTE,
        fields: {
          externalIdVotacao: '999-1',
          votosSimOficial: '300',
          votosSimDerivado: '290',
        },
      });
    });
  });

  describe('when the source has no individual vote directions', () => {
    it('reports an external gap instead of a rejection', async () => {
      // Arrange
      const placares = [
        comparisonRow({
          externalIdVotacao: '2312515-18',
          votosSimOficial: 322,
          votosNaoOficial: 18,
          votosSimDerivado: 0,
          votosNaoDerivado: 0,
          outrosDerivado: {
            abstencao: 0,
            obstrucao: 0,
            artigo17: 0,
            naoInformado: 340,
          },
        }),
      ];

      // Act
      const result = await runStep(placares);

      // Assert
      expect(result.rejected).toEqual([]);
      expect(result.externalGaps).toHaveLength(1);
      expect(result.externalGaps[0]).toMatchObject({
        type: SANITY_VOTOS_AUSENTES,
        reference: '2312515-18',
      });
    });

    it('aborts in strict mode on the first missing-votes gap', async () => {
      // Arrange
      const placares = [
        comparisonRow({
          externalIdVotacao: '2312515-18',
          votosSimOficial: 322,
          votosNaoOficial: 18,
          votosSimDerivado: 0,
          votosNaoDerivado: 0,
          outrosDerivado: {
            abstencao: 0,
            obstrucao: 0,
            artigo17: 0,
            naoInformado: 340,
          },
        }),
      ];

      // Act / Assert
      await expect(runStep(placares, { strict: true })).rejects.toThrow(
        SANITY_VOTOS_AUSENTES,
      );
    });
  });

  describe('when the official tally is absent', () => {
    it('counts the votação as ignored, not rejected', async () => {
      // Arrange
      const placares = [
        comparisonRow({ votosSimOficial: null, votosNaoOficial: null }),
      ];

      // Act
      const result = await runStep(placares);

      // Assert
      expect(result).toMatchObject({ read: 1, ignored: 1, rejected: [] });
    });
  });

  describe('when strict mode finds a divergence', () => {
    it('aborts on the first divergent votação', async () => {
      // Arrange
      const placares = [
        comparisonRow({
          externalIdVotacao: '999-1',
          votosSimOficial: 300,
          votosSimDerivado: 290,
        }),
        comparisonRow({
          externalIdVotacao: '999-2',
          votosNaoOficial: 100,
          votosNaoDerivado: 80,
        }),
      ];

      // Act / Assert
      await expect(runStep(placares, { strict: true })).rejects.toThrow(
        SANITY_PLACAR_DIVERGENTE,
      );
    });
  });

  describe('when running in dry-run mode', () => {
    it('returns an empty result without querying the database', async () => {
      // Arrange
      const repository = createFakeRepository([comparisonRow()]);
      const step = createSanityStep(repository);

      // Act
      const result = await step.run(context({ dryRun: true }));

      // Assert
      expect(result).toMatchObject({ read: 0, rejected: [], ignored: 0 });
      expect(repository.calls).toBe(0);
    });
  });
});
