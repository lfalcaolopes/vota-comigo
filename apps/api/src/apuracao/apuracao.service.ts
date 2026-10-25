import { timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApuracaoSnapshotEvent } from '@vota-comigo/shared-types';

import type { Env } from '@/shared/config/env.validation';

import {
  APURACAO_REPOSITORY,
  type ApuracaoRepository,
} from './apuracao.repository';

@Injectable()
export class ApuracaoService {
  constructor(
    @Inject(APURACAO_REPOSITORY)
    private readonly repository: ApuracaoRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  isAuthorized(token: string | undefined): boolean {
    const expected = this.config.get('APURACAO_SNAPSHOT_TOKEN', {
      infer: true,
    });
    if (!expected || !token) return false;
    const given = Buffer.from(token);
    const wanted = Buffer.from(expected);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  }

  async recordSnapshot(event: ApuracaoSnapshotEvent): Promise<boolean> {
    return this.repository.recordSnapshot(event);
  }
}
