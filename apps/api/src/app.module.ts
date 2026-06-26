import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { DeputadosModule } from './deputados/deputados.module';
import { HealthModule } from './health/health.module';
import { MatcherModule } from './matcher/matcher.module';
import { ProposicoesModule } from './proposicoes/proposicoes.module';
import { validateEnv } from './shared/config/env.validation';
import { DatabaseModule } from './shared/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    ProposicoesModule,
    MatcherModule,
    DeputadosModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
