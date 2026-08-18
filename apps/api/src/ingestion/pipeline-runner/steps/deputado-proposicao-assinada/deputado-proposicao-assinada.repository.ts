import { eq, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoProposicaoAssinada,
  proposicaoTipo,
} from '@/shared/database/schema';

import type {
  DeputadoProposicaoAssinadaRepository,
  DeputadoProposicaoAssinadaRow,
  ProposicaoTipoRow,
} from './deputado-proposicao-assinada.repository.types';

const INSERT_CHUNK_SIZE = 500;

export function createDeputadoProposicaoAssinadaRepository(
  db: DrizzleDatabase,
): DeputadoProposicaoAssinadaRepository {
  return {
    async loadDeputadoIdByExternalId() {
      const rows = await db
        .select({ externalId: deputado.externalIdDeputado, id: deputado.id })
        .from(deputado);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },

    async upsertTipos(rows) {
      if (rows.length === 0) {
        return;
      }

      await db
        .insert(proposicaoTipo)
        .values(rows.map(toTipoValues))
        .onConflictDoUpdate({
          target: proposicaoTipo.siglaTipo,
          set: {
            descricaoTipo: sql`excluded.descricao_tipo`,
            externalCodTipo: sql`excluded.external_cod_tipo`,
          },
        });
    },

    async replaceAno(year, rows) {
      return db.transaction(async (tx) => {
        await tx
          .delete(deputadoProposicaoAssinada)
          .where(eq(deputadoProposicaoAssinada.year, year));

        if (rows.length === 0) {
          return { inserted: 0 };
        }

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(deputadoProposicaoAssinada)
            .values(chunk.map(toValues))
            .returning({ id: deputadoProposicaoAssinada.id });
          inserted += result.length;
        }

        return { inserted };
      });
    },
  };
}

function toValues(
  row: DeputadoProposicaoAssinadaRow,
): typeof deputadoProposicaoAssinada.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    year: row.year,
    assinaturasJson: row.assinaturasJson,
    composicaoJson: row.composicaoJson,
  };
}

function toTipoValues(
  row: ProposicaoTipoRow,
): typeof proposicaoTipo.$inferInsert {
  return {
    siglaTipo: row.siglaTipo,
    descricaoTipo: row.descricaoTipo,
    externalCodTipo: row.externalCodTipo,
  };
}
