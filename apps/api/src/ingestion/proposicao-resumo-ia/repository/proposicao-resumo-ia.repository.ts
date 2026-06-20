import { asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  proposicao,
  proposicaoComputavel,
  proposicaoResumoIa,
} from '@/shared/database/schema';
import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaRow,
  ProposicaoResumoIaUpsertResult,
} from './proposicao-resumo-ia.repository.types';

export function createProposicaoResumoIaRepository(
  db: DrizzleDatabase,
): ProposicaoResumoIaRepository {
  return {
    async resolveProposicaoIds(externalIds) {
      if (externalIds.length === 0) {
        return new Map();
      }

      const rows = await db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          proposicaoId: proposicao.id,
        })
        .from(proposicao)
        .where(inArray(proposicao.externalIdProposicao, [...externalIds]));

      return new Map(
        rows.map((row) => [row.externalIdProposicao, row.proposicaoId]),
      );
    },

    async loadProposicoesComputaveisSources() {
      const rows = await db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          siglaTipo: proposicao.siglaTipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          descricaoTipo: proposicao.descricaoTipo,
          ementa: proposicao.ementa,
          ementaDetalhada: proposicao.ementaDetalhada,
          keywords: proposicao.keywords,
          urlInteiroTeor: proposicao.urlInteiroTeor,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          proposicao,
          eq(proposicaoComputavel.proposicaoId, proposicao.id),
        )
        .orderBy(
          desc(proposicaoComputavel.volumeVotacoesPlenario),
          sql`${proposicao.ano} desc nulls last`,
          sql`${proposicao.numero} desc nulls last`,
          asc(proposicao.siglaTipo),
          asc(proposicao.externalIdProposicao),
        );
      return rows;
    },

    async upsert(rows): Promise<ProposicaoResumoIaUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(proposicaoResumoIa)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: proposicaoResumoIa.proposicaoId,
          set: {
            sourceHash: sql`excluded.source_hash`,
            generationStatus: sql`excluded.generation_status`,
            reviewStatus: sql`excluded.review_status`,
            resumoCard: sql`excluded.resumo_card`,
            resumoDetalhe: sql`excluded.resumo_detalhe`,
            model: sql`excluded.model`,
            promptVersion: sql`excluded.prompt_version`,
            generatedAt: sql`excluded.generated_at`,
            reviewedAt: sql`excluded.reviewed_at`,
            importedAt: sql`now()`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;
      return { inserted, updated: result.length - inserted };
    },
  };
}

function toValues(
  row: ProposicaoResumoIaRow,
): typeof proposicaoResumoIa.$inferInsert {
  return {
    proposicaoId: row.proposicaoId,
    sourceHash: row.sourceHash,
    generationStatus: row.generationStatus,
    reviewStatus: row.reviewStatus,
    resumoCard: row.resumoCard,
    resumoDetalhe: row.resumoDetalhe,
    model: row.model,
    promptVersion: row.promptVersion,
    generatedAt: row.generatedAt,
    reviewedAt: row.reviewedAt,
  };
}
