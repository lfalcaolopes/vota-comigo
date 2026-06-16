import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import type { DeputadoPerfil } from '@vota-comigo/shared-types';

import { DeputadosService } from './deputados.service';

@Controller('deputados')
export class DeputadosController {
  constructor(private readonly service: DeputadosService) {}

  @Get(':externalIdDeputado')
  async perfil(
    @Param('externalIdDeputado', ParseIntPipe) externalIdDeputado: number,
  ): Promise<DeputadoPerfil> {
    return this.service.perfil(externalIdDeputado);
  }
}
