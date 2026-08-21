import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { CotaController } from './cota.controller';
import { COTA_REPOSITORY, createCotaRepository } from './cota.repository';
import { CotaService } from './cota.service';

@Module({
  controllers: [CotaController],
  providers: [
    CotaService,
    {
      provide: COTA_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createCotaRepository(db),
    },
  ],
})
export class CotaModule {}
