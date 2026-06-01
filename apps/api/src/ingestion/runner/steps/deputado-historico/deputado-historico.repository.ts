import { eq, inArray, notExists, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { deputado, deputadoHistorico, partido } from '@/shared/database/schema';
import type {
  DeputadoHistoricoRepository,
  DeputadoHistoricoRow,
  DeputadoHistoricoUpsertResult,
  DeputadoSource,
  PartidoLookup,
} from './deputado-historico.repository.types';

// Drizzle builds the insert SQL by recursing over every bind parameter, so a
// single insert with all rows overflows the call stack. Chunk to keep each
// query small and well under Postgres' 65535 bind-parameter limit.
const UPSERT_CHUNK_SIZE = 1000;

export function createDeputadoHistoricoRepository(
  db: DrizzleDatabase,
): DeputadoHistoricoRepository {
  return {
    async upsert(rows): Promise<DeputadoHistoricoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      // One transaction per call so a deputado's events are committed
      // all-or-nothing; the step relies on "has rows" meaning "fully done".
      return db.transaction(async (tx) => {
        let inserted = 0;
        let updated = 0;

        for (let start = 0; start < rows.length; start += UPSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + UPSERT_CHUNK_SIZE);
          const result = await upsertChunk(tx, chunk);

          inserted += result.inserted;
          updated += result.updated;
        }

        return { inserted, updated };
      });
    },
  };
}

type TransactionExecutor = Parameters<
  Parameters<DrizzleDatabase['transaction']>[0]
>[0];

async function upsertChunk(
  db: TransactionExecutor,
  rows: readonly DeputadoHistoricoRow[],
): Promise<DeputadoHistoricoUpsertResult> {
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
}

export type CreateDeputadoSourceOptions = {
  onlyExternalIds?: readonly number[];
  refetchHistorico?: boolean;
};

export function createDeputadoSource(
  db: DrizzleDatabase,
  options: CreateDeputadoSourceOptions = {},
): DeputadoSource {
  const { onlyExternalIds, refetchHistorico = false } = options;

  return {
    async loadIngested() {
      const selection = db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
        })
        .from(deputado);

      // A targeted retry forces the given deputados regardless of what is
      // already persisted; it overrides the pending filter.
      if (onlyExternalIds !== undefined && onlyExternalIds.length > 0) {
        return selection
          .where(inArray(deputado.externalIdDeputado, [...onlyExternalIds]))
          .orderBy(deputado.externalIdDeputado);
      }

      if (refetchHistorico) {
        return selection.orderBy(deputado.externalIdDeputado);
      }

      // Default resume: only deputados with no history rows yet (pending),
      // oldest external id first so successive windows make steady progress.
      return selection
        .where(
          notExists(
            db
              .select({ one: sql`1` })
              .from(deputadoHistorico)
              .where(eq(deputadoHistorico.deputadoId, deputado.id)),
          ),
        )
        .orderBy(deputado.externalIdDeputado);
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
