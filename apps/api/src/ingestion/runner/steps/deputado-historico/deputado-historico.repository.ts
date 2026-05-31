import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { deputado, deputadoHistorico, partido } from '@/shared/database/schema';
import type {
  DeputadoHistoricoRepository,
  DeputadoHistoricoRow,
  DeputadoHistoricoUpsertResult,
  DeputadoSource,
  PartidoLookup,
} from './deputado-historico.repository.types';

export function createDeputadoHistoricoRepository(
  db: DrizzleDatabase,
): DeputadoHistoricoRepository {
  return {
    async upsert(rows): Promise<DeputadoHistoricoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(deputadoHistorico)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: [
            deputadoHistorico.deputadoId,
            deputadoHistorico.dataHora,
            deputadoHistorico.descricaoStatus,
          ],
          set: {
            legislaturaId: sql`excluded.legislatura_id`,
            partidoId: sql`excluded.partido_id`,
            situacao: sql`excluded.situacao`,
            condicaoEleitoral: sql`excluded.condicao_eleitoral`,
            nome: sql`excluded.nome`,
            nomeEleitoral: sql`excluded.nome_eleitoral`,
            siglaUf: sql`excluded.sigla_uf`,
            email: sql`excluded.email`,
            urlFoto: sql`excluded.url_foto`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;

      return { inserted, updated: result.length - inserted };
    },
  };
}

export function createDeputadoSource(db: DrizzleDatabase): DeputadoSource {
  return {
    async loadIngested() {
      return db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
        })
        .from(deputado);
    },
  };
}

export function createPartidoLookup(db: DrizzleDatabase): PartidoLookup {
  return {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      const rows = await db
        .select({
          externalIdPartido: partido.externalIdPartido,
          id: partido.id,
        })
        .from(partido);

      return new Map(rows.map((row) => [row.externalIdPartido, row.id]));
    },
  };
}

function toValues(
  row: DeputadoHistoricoRow,
): typeof deputadoHistorico.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    legislaturaId: row.legislaturaId,
    partidoId: row.partidoId,
    dataHora: row.dataHora,
    situacao: row.situacao,
    condicaoEleitoral: row.condicaoEleitoral,
    descricaoStatus: row.descricaoStatus,
    nome: row.nome,
    nomeEleitoral: row.nomeEleitoral,
    siglaUf: row.siglaUf,
    email: row.email,
    urlFoto: row.urlFoto,
  };
}
