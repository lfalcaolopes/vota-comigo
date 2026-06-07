import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { ProposicoesController } from './proposicoes.controller';
import {
  PROPOSICOES_REPOSITORY,
  createProposicoesRepository,
} from './proposicoes.repository';
import { ProposicoesService } from './proposicoes.service';

@Module({
  controllers: [ProposicoesController],
  providers: [
    ProposicoesService,
    {
      provide: PROPOSICOES_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createProposicoesRepository(db),
    },
  ],
})
export class ProposicoesModule {}
