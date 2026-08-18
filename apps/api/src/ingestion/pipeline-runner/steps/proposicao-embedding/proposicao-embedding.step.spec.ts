import type {
  EmbeddingClient,
  EmbeddingOutcome,
} from '@/shared/embedding/openrouter-embedding-client';

import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';
import { createProposicaoEmbeddingStep } from './proposicao-embedding.step';
import type {
  ProposicaoEmbeddingRepository,
  ProposicaoEmbeddingRow,
  ProposicaoEmbeddingSourceRow,
} from './proposicao-embedding.repository.types';

const MODEL = 'openai/text-embedding-3-small';
const DIM = 3;

function buildSource(
  overrides: Partial<ProposicaoEmbeddingSourceRow> = {},
): ProposicaoEmbeddingSourceRow {
  return {
    proposicaoId: 'uuid-1',
    externalIdProposicao: 1,
    ementa: 'Institui o piso salarial da enfermagem.',
    keywords: 'Saúde',
    resumoIa: null,
    sourceHash: null,
    ...overrides,
  };
}

function buildRepository(sources: readonly ProposicaoEmbeddingSourceRow[]) {
  const upserted: ProposicaoEmbeddingRow[][] = [];
  let deleteCalls = 0;

  const repository: ProposicaoEmbeddingRepository = {
    loadSources: () => Promise.resolve(sources),
    upsert: (rows) => {
      upserted.push([...rows]);
      return Promise.resolve({ inserted: rows.length, updated: 0 });
    },
    deleteNaoComputaveis: () => {
      deleteCalls += 1;
      return Promise.resolve(0);
    },
  };

  return { repository, upserted, deleted: () => deleteCalls };
}

function buildClient(outcomes: readonly EmbeddingOutcome[] = []) {
  const batches: (readonly string[])[] = [];
  const queue = [...outcomes];

  const client: EmbeddingClient = {
    embed: (inputs) => {
      batches.push([...inputs]);
      const next = queue.shift();
      if (next !== undefined) {
        return Promise.resolve(next);
      }
      return Promise.resolve({
        ok: true,
        embeddings: inputs.map(() => [1, 2, 3]),
      });
    },
  };

  return { client, batches };
}

function buildContext(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    sourceFile: 'proposicao_embedding',
    ...overrides,
  } as IngestionStepContext;
}

describe('proposicao_embedding step', () => {
  describe('when a source hash has not changed', () => {
    it('does not embed the row again', async () => {
      // Arrange
      const unchanged = buildSource();
      const { repository, upserted } = buildRepository([unchanged]);
      const { client, batches } = buildClient();
      const step = createProposicaoEmbeddingStep({
        repository,
        client,
        model: MODEL,
        dimensions: DIM,
      });

      // Act
      const first = await step.run(buildContext());
      const reloaded = buildSource({
        sourceHash: upserted[0][0].sourceHash,
      });
      const second = await createProposicaoEmbeddingStep({
        repository: buildRepository([reloaded]).repository,
        client,
        model: MODEL,
        dimensions: DIM,
      }).run(buildContext());

      // Assert
      expect(first.inserted).toBe(1);
      expect(second.inserted).toBe(0);
      expect(second.ignored).toBe(1);
      expect(batches).toHaveLength(1);
    });
  });

  describe('when the approved resumo changes', () => {
    it('embeds the row again, since the resumo is part of the text', async () => {
      // Arrange
      const withResumo = buildSource({
        resumoIa: {
          generationStatus: 'generated',
          reviewStatus: 'approved',
          resumoCard: 'Cria um piso de remuneração.',
          resumoDetalhe: 'Detalhe revisado.',
        },
        sourceHash: 'hash-de-antes-do-resumo',
      });
      const { repository, upserted } = buildRepository([withResumo]);
      const { client } = buildClient();
      const step = createProposicaoEmbeddingStep({
        repository,
        client,
        model: MODEL,
        dimensions: DIM,
      });

      // Act
      const result = await step.run(buildContext());

      // Assert
      expect(result.inserted).toBe(1);
      expect(upserted[0][0].sourceHash).not.toBe('hash-de-antes-do-resumo');
    });
  });

  describe('when the run is a dry run', () => {
    it('reports what would change without calling the provider', async () => {
      // Arrange
      const { repository, upserted, deleted } = buildRepository([
        buildSource(),
      ]);
      const { client, batches } = buildClient();
      const step = createProposicaoEmbeddingStep({
        repository,
        client,
        model: MODEL,
        dimensions: DIM,
      });

      // Act
      const result = await step.run(buildContext({ dryRun: true }));

      // Assert
      expect(batches).toHaveLength(0);
      expect(upserted).toHaveLength(0);
      expect(deleted()).toBe(0);
      expect(result.read).toBe(1);
      expect(result.inserted).toBe(0);
    });
  });

  describe('when the provider fails for one batch', () => {
    it('records the rejection and keeps the other batches', async () => {
      // Arrange
      const { repository, upserted } = buildRepository([
        buildSource({ proposicaoId: 'uuid-1', externalIdProposicao: 1 }),
        buildSource({ proposicaoId: 'uuid-2', externalIdProposicao: 2 }),
      ]);
      const { client } = buildClient([
        { ok: false, reason: 'HTTP 503' },
        { ok: true, embeddings: [[1, 2, 3]] },
      ]);
      const step = createProposicaoEmbeddingStep({
        repository,
        client,
        model: MODEL,
        dimensions: DIM,
        batchSize: 1,
      });

      // Act
      const result = await step.run(buildContext());

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].message).toContain('HTTP 503');
      expect(result.inserted).toBe(1);
      expect(upserted).toHaveLength(1);
    });
  });

  describe('when a proposicao leaves the computable set', () => {
    it('drops its embedding so the table matches the corpus', async () => {
      // Arrange
      const { repository, deleted } = buildRepository([]);
      const { client } = buildClient();
      const step = createProposicaoEmbeddingStep({
        repository,
        client,
        model: MODEL,
        dimensions: DIM,
      });

      // Act
      await step.run(buildContext());

      // Assert
      expect(deleted()).toBe(1);
    });
  });
});
