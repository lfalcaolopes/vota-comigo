import type {
  MatcherCompletionEvent,
  MatcherStartEvent,
} from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import { matcherCompletion, matcherStart } from '@/shared/database/schema';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export interface AnalyticsRepository {
  recordMatcherStart(event: MatcherStartEvent): Promise<void>;
  recordMatcherCompletion(event: MatcherCompletionEvent): Promise<void>;
}

export function createAnalyticsRepository(
  db: DrizzleDatabase,
): AnalyticsRepository {
  return {
    async recordMatcherStart(event) {
      await db.insert(matcherStart).values({
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmContent: event.utmContent,
        referrer: event.referrer,
      });
    },

    async recordMatcherCompletion(event) {
      await db.insert(matcherCompletion).values({
        totalSelecionadas: event.totalSelecionadas,
        totalRespondidas: event.totalRespondidas,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmContent: event.utmContent,
        referrer: event.referrer,
      });
    },
  };
}
