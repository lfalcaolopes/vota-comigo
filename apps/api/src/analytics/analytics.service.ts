import { Inject, Injectable } from '@nestjs/common';

import type { MatcherCompletionEvent } from '@vota-comigo/shared-types';

import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepository,
} from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly repository: AnalyticsRepository,
  ) {}

  async recordMatcherCompletion(event: MatcherCompletionEvent): Promise<void> {
    await this.repository.recordMatcherCompletion(event);
  }
}
