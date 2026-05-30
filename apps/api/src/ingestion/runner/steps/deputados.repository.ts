import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { deputado, legislatura } from '@/shared/database/schema';
import type {
  DeputadoRepository,
  DeputadoRow,
  DeputadoUpsertResult,
  LegislaturaLookup,
} from './deputados.repository.types';

export function createDeputadoRepository(
  db: DrizzleDatabase,
): DeputadoRepository {
  return {
    async upsert(rows): Promise<DeputadoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(deputado)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: deputado.externalIdDeputado,
          set: {
            uri: sql`excluded.uri`,
            nome: sql`excluded.nome`,
            nomeCivil: sql`excluded.nome_civil`,
            siglaSexo: sql`excluded.sigla_sexo`,
            dataNascimento: sql`excluded.data_nascimento`,
            dataFalecimento: sql`excluded.data_falecimento`,
            ufNascimento: sql`excluded.uf_nascimento`,
            municipioNascimento: sql`excluded.municipio_nascimento`,
            urlRedeSocial: sql`excluded.url_rede_social`,
            urlWebsite: sql`excluded.url_website`,
            legislaturaInicialId: sql`excluded.legislatura_inicial_id`,
            legislaturaFinalId: sql`excluded.legislatura_final_id`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;

      return {
        inserted,
        updated: result.length - inserted,
      };
    },
  };
}

export function createLegislaturaLookup(
  db: DrizzleDatabase,
): LegislaturaLookup {
  return {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      const rows = await db
        .select({
          externalIdLegislatura: legislatura.externalIdLegislatura,
          id: legislatura.id,
        })
        .from(legislatura);

      return new Map(rows.map((row) => [row.externalIdLegislatura, row.id]));
    },
  };
}

function toValues(row: DeputadoRow): typeof deputado.$inferInsert {
  return {
    externalIdDeputado: row.externalIdDeputado,
    uri: row.uri,
    nome: row.nome,
    nomeCivil: row.nomeCivil,
    siglaSexo: row.siglaSexo,
    dataNascimento: row.dataNascimento,
    dataFalecimento: row.dataFalecimento,
    ufNascimento: row.ufNascimento,
    municipioNascimento: row.municipioNascimento,
    urlRedeSocial: row.urlRedeSocial,
    urlWebsite: row.urlWebsite,
    legislaturaInicialId: row.legislaturaInicialId,
    legislaturaFinalId: row.legislaturaFinalId,
  };
}
