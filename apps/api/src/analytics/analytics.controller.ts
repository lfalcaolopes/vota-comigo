import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  matcherCompletionEventSchema,
  type MatcherCompletionEvent,
  matcherStartEventSchema,
  type MatcherStartEvent,
} from '@vota-comigo/shared-types';

import { ZodValidationPipe } from '@/shared/validation/zod-validation.pipe';

import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('matcher-start')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async matcherStart(
    @Body(new ZodValidationPipe(matcherStartEventSchema))
    body: MatcherStartEvent,
  ): Promise<void> {
    await this.service.recordMatcherStart(body);
  }

  @Post('matcher-completion')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async matcherCompletion(
    @Body(new ZodValidationPipe(matcherCompletionEventSchema))
    body: MatcherCompletionEvent,
  ): Promise<void> {
    await this.service.recordMatcherCompletion(body);
  }
}
