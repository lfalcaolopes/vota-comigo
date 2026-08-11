import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { DeputadosController } from './deputados.controller';
import {
  DEPUTADOS_REPOSITORY,
  createDeputadosRepository,
} from './deputados.repository';
import { DeputadosService } from './deputados.service';
import {
  CAMARA_PAGINATED_CLIENT,
  createCamaraPaginatedClient,
} from '../shared/camara/camara-paginated-client';
import { createCamaraJsonTransport } from '../shared/camara/camara-json-transport';

const CAMARA_RUNTIME_TIMEOUT_MS = 5_000;

@Module({
  controllers: [DeputadosController],
  providers: [
    DeputadosService,
    {
      provide: CAMARA_PAGINATED_CLIENT,
      useFactory: () =>
        createCamaraPaginatedClient({
          transport: createCamaraJsonTransport({
            timeoutMs: CAMARA_RUNTIME_TIMEOUT_MS,
          }),
        }),
    },
    {
      provide: DEPUTADOS_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createDeputadosRepository(db),
    },
  ],
})
export class DeputadosModule {}
