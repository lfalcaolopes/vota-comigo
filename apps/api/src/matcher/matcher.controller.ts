import {
  Body,
  Controller,
  HttpCode,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  matcherExecucaoRequestSchema,
  type MatcherExecucaoRequest,
  type MatcherResultado,
} from '@vota-comigo/shared-types';

import { ZodValidationPipe } from '@/shared/validation/zod-validation.pipe';

import { MatcherService } from './matcher.service';
import { normalizePagination } from './rules/pagination';

@Controller('matcher')
export class MatcherController {
  constructor(private readonly service: MatcherService) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body(new ZodValidationPipe(matcherExecucaoRequestSchema))
    body: MatcherExecucaoRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<MatcherResultado> {
    const pagination = normalizePagination(limit, offset);
    return this.service.execute(body, pagination);
  }
}
