import { Controller, Get } from '@nestjs/common';

import type { CotaLegislaturaResponse } from '@vota-comigo/shared-types';

import { CotaService } from './cota.service';
import { CACHE_REFERENCE } from '../shared/http/cache-control';
import { CacheControl } from '../shared/http/cache-control.decorator';

@Controller('cota')
export class CotaController {
  constructor(private readonly service: CotaService) {}

  @Get('legislatura')
  @CacheControl(CACHE_REFERENCE)
  async legislatura(): Promise<CotaLegislaturaResponse> {
    return this.service.legislatura();
  }
}
