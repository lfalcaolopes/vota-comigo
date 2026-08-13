import { eq, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  cotaCategoria,
  cotaCobertura,
  deputado,
  deputadoGastoCota,
} from '@/shared/database/schema';

import type {
  DeputadoGastoCotaAnoRow,
  DeputadoGastoCotaRepository,
} from './deputado-gasto-cota.repository.types';

const INSERT_CHUNK_SIZE = 500;

export function createDeputadoGastoCotaRepository(
  db: DrizzleDatabase,
): DeputadoGastoCotaRepository {
  return {
    async loadDeputadoIdByExternalId() {
      const rows = await db
        .select({ externalId: deputado.externalIdDeputado, id: deputado.id })
        .from(deputado);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },

    async replaceAno({ year, coveredThroughMonth, rows, categorias }) {
      return db.transaction(async (tx) => {
        await tx
          .delete(deputadoGastoCota)
          .where(eq(deputadoGastoCota.year, year));

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(deputadoGastoCota)
            .values(chunk.map(toValues))
            .returning({ id: deputadoGastoCota.id });
          inserted += result.length;
        }

        if (categorias.length > 0) {
          await tx
            .insert(cotaCategoria)
            .values([...categorias])
            .onConflictDoUpdate({
              target: cotaCategoria.externalNumSubCota,
              set: { descricao: sql`excluded.descricao` },
            });
        }

        await tx
          .insert(cotaCobertura)
          .values({ year, coveredThroughMonth })
          .onConflictDoUpdate({
            target: cotaCobertura.year,
            set: { coveredThroughMonth, ingestedAt: new Date().toISOString() },
          });

        return { inserted };
      });
    },
  };
}

function toValues(
  row: DeputadoGastoCotaAnoRow,
): typeof deputadoGastoCota.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    year: row.year,
    gastosJson: row.gastosJson,
  };
}
