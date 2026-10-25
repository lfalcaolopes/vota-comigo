import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  apuracaoSnapshotEventSchema,
  type ApuracaoSnapshotEvent,
} from '@vota-comigo/shared-types';

import { ZodValidationPipe } from '@/shared/validation/zod-validation.pipe';

import { ApuracaoService } from './apuracao.service';

export const APURACAO_TOKEN_HEADER = 'x-apuracao-token';

@Controller('apuracao')
export class ApuracaoController {
  constructor(private readonly service: ApuracaoService) {}

  @Post('snapshots')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async recordSnapshot(
    @Headers(APURACAO_TOKEN_HEADER) token: string | undefined,
    @Body(new ZodValidationPipe(apuracaoSnapshotEventSchema))
    body: ApuracaoSnapshotEvent,
  ): Promise<{ saved: boolean }> {
    if (!this.service.isAuthorized(token)) {
      throw new UnauthorizedException();
    }
    return { saved: await this.service.recordSnapshot(body) };
  }
}
