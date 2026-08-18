import { eq } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoOrgao,
  legislatura,
  orgao,
} from '@/shared/database/schema';

import type {
  DeputadoOrgaoRepository,
  DeputadoOrgaoRow,
} from './deputado-orgao.repository.types';

const INSERT_CHUNK_SIZE = 500;

export function createDeputadoOrgaoRepository(
  db: DrizzleDatabase,
): DeputadoOrgaoRepository {
  return {
    async loadDeputadoIdByExternalId() {
      const rows = await db
        .select({ externalId: deputado.externalIdDeputado, id: deputado.id })
        .from(deputado);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },

    async loadLegislaturaIdByExternalId() {
      const rows = await db
        .select({
          externalId: legislatura.externalIdLegislatura,
          id: legislatura.id,
        })
        .from(legislatura);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },

    async loadOrgaoIdByExternalId() {
      const rows = await db
        .select({ externalId: orgao.externalIdOrgao, id: orgao.id })
        .from(orgao);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },

    async replaceLegislatura(legislaturaId, rows) {
      return db.transaction(async (tx) => {
        await tx
          .delete(deputadoOrgao)
          .where(eq(deputadoOrgao.legislaturaId, legislaturaId));

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(deputadoOrgao)
            .values(chunk.map(toValues))
            .returning({ id: deputadoOrgao.id });
          inserted += result.length;
        }

        return { inserted };
      });
    },
  };
}

function toValues(row: DeputadoOrgaoRow): typeof deputadoOrgao.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    orgaoId: row.orgaoId,
    legislaturaId: row.legislaturaId,
    cargo: row.cargo,
    dataInicio: row.dataInicio,
    dataFim: row.dataFim,
  };
}
