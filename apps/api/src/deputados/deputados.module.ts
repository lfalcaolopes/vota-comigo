import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { DeputadosController } from './deputados.controller';
import {
  DEPUTADOS_REPOSITORY,
  createDeputadosRepository,
} from './deputados.repository';
import { DeputadosService } from './deputados.service';

@Module({
  controllers: [DeputadosController],
  providers: [
    DeputadosService,
    {
      provide: DEPUTADOS_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createDeputadosRepository(db),
    },
  ],
})
export class DeputadosModule {}
