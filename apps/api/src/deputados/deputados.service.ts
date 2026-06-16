import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { DeputadoPerfil } from '@vota-comigo/shared-types';

import { toDeputadoPerfil } from './mappers/deputado-perfil.mapper';
import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from './deputados.repository';

@Injectable()
export class DeputadosService {
  constructor(
    @Inject(DEPUTADOS_REPOSITORY)
    private readonly repository: DeputadosRepository,
  ) {}

  async perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }
    const votacoesPlenario =
      await this.repository.loadVotacoesPlenarioForDeputado(source.id);
    return toDeputadoPerfil(source, votacoesPlenario);
  }
}
