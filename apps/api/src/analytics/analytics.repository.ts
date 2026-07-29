import type { MatcherCompletionEvent } from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import { matcherCompletion } from '@/shared/database/schema';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export interface AnalyticsRepository {
  recordMatcherCompletion(event: MatcherCompletionEvent): Promise<void>;
}

export function createAnalyticsRepository(
  db: DrizzleDatabase,
): AnalyticsRepository {
  return {
    async recordMatcherCompletion(event) {
      await db.insert(matcherCompletion).values({
        totalSelecionadas: event.totalSelecionadas,
        totalRespondidas: event.totalRespondidas,
      });
    },
  };
}
