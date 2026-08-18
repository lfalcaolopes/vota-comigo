import {
  calculateProposicaoEmbeddingSourceHash,
  toProposicaoEmbeddingText,
} from '@/proposicoes/rules/proposicao-embedding-source';
import type { EmbeddingClient } from '@/shared/embedding/openrouter-embedding-client';

import { StrictModeError } from '../../errors/strict-mode-error';
import { createProgressLogger } from '../../reporting/step-logging';
import type {
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  ProposicaoEmbeddingRepository,
  ProposicaoEmbeddingRow,
  ProposicaoEmbeddingSourceRow,
} from './proposicao-embedding.repository.types';

export const PROPOSICAO_EMBEDDING_BATCH_SIZE = 64;

export const PROPOSICAO_EMBEDDING_PROGRESS_INTERVAL = 100;

export type ProposicaoEmbeddingStepDeps = {
  repository: ProposicaoEmbeddingRepository;
  client: EmbeddingClient;
  model: string;
  dimensions: number;
  batchSize?: number;
};

export function createProposicaoEmbeddingStep(
  deps: ProposicaoEmbeddingStepDeps,
): IngestionStep {
  const batchSize = deps.batchSize ?? PROPOSICAO_EMBEDDING_BATCH_SIZE;

  return {
    name: 'proposicao_embedding',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      context.reporter?.log(
        '[proposicao_embedding] carregando proposições computáveis…',
      );

      const sources = await deps.repository.loadSources();
      const pendentes = sources.filter(
        (source) => toEmbeddingHash(source, deps.model) !== source.sourceHash,
      );

      context.reporter?.log(
        `[proposicao_embedding] ${pendentes.length} de ${sources.length} proposição(ões) com texto novo ou alterado`,
      );

      if (context.dryRun) {
        return {
          read: sources.length,
          inserted: 0,
          updated: 0,
          ignored: sources.length - pendentes.length,
          rejected: [],
          externalGaps: [],
        };
      }

      const progress = createProgressLogger(
        context.reporter,
        'proposicao_embedding',
        {
          interval: PROPOSICAO_EMBEDDING_PROGRESS_INTERVAL,
          unit: 'proposição(ões)',
        },
      );

      const rejected: Rejection[] = [];
      let inserted = 0;
      let updated = 0;
      let processed = 0;

      for (const batch of toBatches(pendentes, batchSize)) {
        const outcome = await deps.client.embed(
          batch.map((source) => toProposicaoEmbeddingText(source)),
        );

        if (!outcome.ok) {
          const rejection = toRejection(context, batch, outcome.reason);
          if (context.strict) {
            throw new StrictModeError(rejection);
          }
          rejected.push(rejection);
          continue;
        }

        const rows = batch.map<ProposicaoEmbeddingRow>((source, index) => ({
          proposicaoId: source.proposicaoId,
          sourceHash: toEmbeddingHash(source, deps.model),
          embedding: outcome.embeddings[index],
          model: deps.model,
          dim: deps.dimensions,
        }));

        const result = await deps.repository.upsert(rows);
        inserted += result.inserted;
        updated += result.updated;
        processed += rows.length;
        progress.tick(processed);
      }

      progress.done(processed);

      const removidos = await deps.repository.deleteNaoComputaveis();
      if (removidos > 0) {
        context.reporter?.log(
          `[proposicao_embedding] ${removidos} embedding(s) de proposição não computável removido(s)`,
        );
      }

      return {
        read: sources.length,
        inserted,
        updated,
        ignored: sources.length - pendentes.length,
        rejected,
        externalGaps: [],
      };
    },
  };
}

function toEmbeddingHash(
  source: ProposicaoEmbeddingSourceRow,
  model: string,
): string {
  return calculateProposicaoEmbeddingSourceHash(source, model);
}

function toBatches<T>(
  items: readonly T[],
  size: number,
): readonly (readonly T[])[] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}

function toRejection(
  context: IngestionStepContext,
  batch: readonly ProposicaoEmbeddingSourceRow[],
  reason: string,
): Rejection {
  return {
    file: context.sourceFile,
    line: 0,
    type: 'proposicao_embedding',
    fields: {
      externalIdProposicao: batch
        .map((source) => String(source.externalIdProposicao))
        .join(','),
    },
    message: `embedding não gerado: ${reason}`,
  };
}
