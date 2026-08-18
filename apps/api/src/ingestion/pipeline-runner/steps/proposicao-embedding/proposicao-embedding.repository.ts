import { eq, notInArray, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  proposicao,
  proposicaoComputavel,
  proposicaoEmbedding,
  proposicaoResumoIa,
} from '@/shared/database/schema';
import {
  proposicaoResumoIaGenerationStatus,
  proposicaoResumoIaReviewStatus,
} from '@vota-comigo/shared-types';

import type {
  ProposicaoEmbeddingRepository,
  ProposicaoEmbeddingRow,
  ProposicaoEmbeddingUpsertResult,
} from './proposicao-embedding.repository.types';

export function createProposicaoEmbeddingRepository(
  db: DrizzleDatabase,
): ProposicaoEmbeddingRepository {
  return {
    async loadSources() {
      const rows = await db
        .select({
          proposicaoId: proposicao.id,
          externalIdProposicao: proposicao.externalIdProposicao,
          ementa: proposicao.ementa,
          keywords: proposicao.keywords,
          resumoIaGenerationStatus: proposicaoResumoIa.generationStatus,
          resumoIaReviewStatus: proposicaoResumoIa.reviewStatus,
          resumoIaCard: proposicaoResumoIa.resumoCard,
          resumoIaDetalhe: proposicaoResumoIa.resumoDetalhe,
          sourceHash: proposicaoEmbedding.sourceHash,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          proposicao,
          eq(proposicaoComputavel.proposicaoId, proposicao.id),
        )
        .leftJoin(
          proposicaoResumoIa,
          eq(proposicaoResumoIa.proposicaoId, proposicao.id),
        )
        .leftJoin(
          proposicaoEmbedding,
          eq(proposicaoEmbedding.proposicaoId, proposicao.id),
        )
        .orderBy(proposicao.externalIdProposicao);

      return rows.map((row) => ({
        proposicaoId: row.proposicaoId,
        externalIdProposicao: row.externalIdProposicao,
        ementa: row.ementa,
        keywords: row.keywords,
        resumoIa:
          row.resumoIaGenerationStatus === null ||
          row.resumoIaReviewStatus === null
            ? null
            : {
                generationStatus: proposicaoResumoIaGenerationStatus.parse(
                  row.resumoIaGenerationStatus,
                ),
                reviewStatus: proposicaoResumoIaReviewStatus.parse(
                  row.resumoIaReviewStatus,
                ),
                resumoCard: row.resumoIaCard,
                resumoDetalhe: row.resumoIaDetalhe,
              },
        sourceHash: row.sourceHash,
      }));
    },

    async upsert(rows): Promise<ProposicaoEmbeddingUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(proposicaoEmbedding)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: proposicaoEmbedding.proposicaoId,
          set: {
            sourceHash: sql`excluded.source_hash`,
            embedding: sql`excluded.embedding`,
            model: sql`excluded.model`,
            dim: sql`excluded.dim`,
            generatedAt: sql`now()`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;
      return { inserted, updated: result.length - inserted };
    },

    // Proposicao que deixou de ser computavel sai do corpus da busca; manter o
    // vetor so faria a tabela divergir do que o feed varre.
    async deleteNaoComputaveis() {
      const computaveis = db
        .select({ proposicaoId: proposicaoComputavel.proposicaoId })
        .from(proposicaoComputavel);

      const deleted = await db
        .delete(proposicaoEmbedding)
        .where(notInArray(proposicaoEmbedding.proposicaoId, computaveis))
        .returning({ id: proposicaoEmbedding.id });

      return deleted.length;
    },
  };
}

function toValues(
  row: ProposicaoEmbeddingRow,
): typeof proposicaoEmbedding.$inferInsert {
  return {
    proposicaoId: row.proposicaoId,
    sourceHash: row.sourceHash,
    embedding: [...row.embedding],
    model: row.model,
    dim: row.dim,
  };
}
