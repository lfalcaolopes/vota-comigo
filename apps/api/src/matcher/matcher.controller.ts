import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  matcherExecucaoRequestSchema,
  type MatcherExecucaoRequest,
  type MatcherExecucaoResumo,
} from '@vota-comigo/shared-types';

import { ZodValidationPipe } from '@/shared/validation/zod-validation.pipe';

import { MatcherService } from './matcher.service';

@Controller('matcher')
export class MatcherController {
  constructor(private readonly service: MatcherService) {}

  @Post()
  @HttpCode(200)
  async validar(
    @Body(new ZodValidationPipe(matcherExecucaoRequestSchema))
    body: MatcherExecucaoRequest,
  ): Promise<MatcherExecucaoResumo> {
    return this.service.validarExecucao(body);
  }
}
