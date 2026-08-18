import { Module } from '@nestjs/common';

import { DeputadosModule } from '@/deputados/deputados.module';

import { ComparativoDeputadosController } from './comparativo-deputados.controller';
import { ComparativoDeputadosService } from './comparativo-deputados.service';

@Module({
  imports: [DeputadosModule],
  controllers: [ComparativoDeputadosController],
  providers: [ComparativoDeputadosService],
})
export class ComparativoDeputadosModule {}
