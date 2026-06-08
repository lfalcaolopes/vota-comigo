import type { DrizzleDatabase } from '@/shared/database/client';
import { deputado } from '@/shared/database/schema';
import type { DeputadoLookup } from './votacao-votos.repository.types';

export function createDeputadoLookup(db: DrizzleDatabase): DeputadoLookup {
  return {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      const rows = await db
        .select({
          externalId: deputado.externalIdDeputado,
          id: deputado.id,
        })
        .from(deputado);

      return new Map(rows.map((row) => [row.externalId, row.id]));
    },
  };
}
