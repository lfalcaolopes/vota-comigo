import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeputadosModule } from './deputados/deputados.module';
import { MatcherModule } from './matcher/matcher.module';
import { ProposicoesModule } from './proposicoes/proposicoes.module';
import { DatabaseModule } from './shared/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ProposicoesModule,
    MatcherModule,
    DeputadosModule,
  ],
})
export class AppModule {}
