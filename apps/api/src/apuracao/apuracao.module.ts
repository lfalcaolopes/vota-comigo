import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { ApuracaoController } from './apuracao.controller';
import {
  APURACAO_REPOSITORY,
  createApuracaoRepository,
} from './apuracao.repository';
import { ApuracaoService } from './apuracao.service';

@Module({
  controllers: [ApuracaoController],
  providers: [
    ApuracaoService,
    {
      provide: APURACAO_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createApuracaoRepository(db),
    },
  ],
})
export class ApuracaoModule {}
