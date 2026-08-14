import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { orgao } from '@/shared/database/schema';

import type {
  OrgaoRepository,
  OrgaoRow,
  OrgaoUpsertResult,
} from './orgaos.repository.types';

const UPSERT_CHUNK_SIZE = 500;

export function createOrgaoRepository(db: DrizzleDatabase): OrgaoRepository {
  return {
    async upsert(rows): Promise<OrgaoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      return db.transaction(async (tx) => {
        let inserted = 0;
        let updated = 0;

        for (let start = 0; start < rows.length; start += UPSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + UPSERT_CHUNK_SIZE);
          const result = await tx
            .insert(orgao)
            .values(chunk.map(toValues))
            .onConflictDoUpdate({
              target: orgao.externalIdOrgao,
              set: {
                uri: sql`excluded.uri`,
                sigla: sql`excluded.sigla`,
                apelido: sql`excluded.apelido`,
                nome: sql`excluded.nome`,
                nomePublicacao: sql`excluded.nome_publicacao`,
                externalCodTipoOrgao: sql`excluded.external_cod_tipo_orgao`,
                tipoOrgao: sql`excluded.tipo_orgao`,
                casa: sql`excluded.casa`,
              },
            })
            .returning({ inserted: sql<boolean>`xmax = 0` });

          inserted += result.filter((row) => row.inserted).length;
          updated += result.length - result.filter((row) => row.inserted).length;
        }

        return { inserted, updated };
      });
    },
  };
}

function toValues(row: OrgaoRow): typeof orgao.$inferInsert {
  return {
    externalIdOrgao: row.externalIdOrgao,
    uri: row.uri,
    sigla: row.sigla,
    apelido: row.apelido,
    nome: row.nome,
    nomePublicacao: row.nomePublicacao,
    externalCodTipoOrgao: row.externalCodTipoOrgao,
    tipoOrgao: row.tipoOrgao,
    casa: row.casa,
  };
}
