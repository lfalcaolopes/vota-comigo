import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProposicoesModule } from './proposicoes/proposicoes.module';
import { DatabaseModule } from './shared/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ProposicoesModule,
  ],
})
export class AppModule {}
