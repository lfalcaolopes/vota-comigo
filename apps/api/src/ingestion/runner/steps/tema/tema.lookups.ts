import type { DrizzleDatabase } from '@/shared/database/client';
import { tema } from '@/shared/database/schema';
import type { TemaLookup } from './tema.repository.types';

export function createTemaLookup(db: DrizzleDatabase): TemaLookup {
  return {
    async loadIdByExternalCodTema(): Promise<ReadonlyMap<number, string>> {
      const rows = await db
        .select({ externalCodTema: tema.externalCodTema, id: tema.id })
        .from(tema);

      return new Map(rows.map((row) => [row.externalCodTema, row.id]));
    },
  };
}
