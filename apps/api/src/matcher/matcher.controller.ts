import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  matcherExecucaoRequestSchema,
  type MatcherExecucaoRequest,
  type MatcherResultado,
} from '@vota-comigo/shared-types';

import { ZodValidationPipe } from '@/shared/validation/zod-validation.pipe';

import { MatcherService } from './matcher.service';

@Controller('matcher')
export class MatcherController {
  constructor(private readonly service: MatcherService) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body(new ZodValidationPipe(matcherExecucaoRequestSchema))
    body: MatcherExecucaoRequest,
  ): Promise<MatcherResultado> {
    return this.service.execute(body);
  }
}
