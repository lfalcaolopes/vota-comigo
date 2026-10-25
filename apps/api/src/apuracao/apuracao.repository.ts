import type { ApuracaoSnapshotEvent } from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import { apuracaoSnapshot } from '@/shared/database/schema';

export const APURACAO_REPOSITORY = Symbol('APURACAO_REPOSITORY');

export interface ApuracaoRepository {
  recordSnapshot(event: ApuracaoSnapshotEvent): Promise<boolean>;
}

export function createApuracaoRepository(
  db: DrizzleDatabase,
): ApuracaoRepository {
  return {
    async recordSnapshot(event) {
      const inserted = await db
        .insert(apuracaoSnapshot)
        .values(event)
        .onConflictDoNothing({
          target: [
            apuracaoSnapshot.externalCdEleicao,
            apuracaoSnapshot.urnasStep,
          ],
        })
        .returning({ id: apuracaoSnapshot.id });
      return inserted.length > 0;
    },
  };
}
