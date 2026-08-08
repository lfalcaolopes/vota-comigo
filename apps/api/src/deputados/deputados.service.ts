import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  DeputadoPerfil,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toDeputadoCard } from './mappers/deputado-card.mapper';
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

  async feed(
    limit: number,
    offset: number,
    q?: string,
    emAtividade?: boolean,
    uf?: string,
    partido?: string,
  ): Promise<DeputadosFeedResponse> {
    const page = await this.repository.loadDeputadosFeed(
      { q, emAtividade, uf, partido },
      { limit, offset },
    );

    return {
      items: page.items.map(toDeputadoCard),
      total: page.total,
      limit,
      offset,
    };
  }

  async ufsDisponiveis(): Promise<UfsDisponiveisResponse> {
    const siglas = new Set(await this.repository.loadUfsDisponiveis());
    return {
      items: [...siglas].sort().map((siglaUf) => ({ siglaUf })),
    };
  }

  async partidosDisponiveis(): Promise<PartidosDisponiveisResponse> {
    const siglas = new Set(await this.repository.loadPartidosDisponiveis());
    return {
      items: [...siglas].sort().map((siglaPartido) => ({ siglaPartido })),
    };
  }

  async perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
    const source = await this.repository.loadDeputadoPerfil(externalIdDeputado);
    if (source === null) {
      throw new NotFoundException('deputado nao encontrado');
    }
    const resumoPresenca = await this.repository.loadResumoPresenca(source.id);
    return toDeputadoPerfil(source, resumoPresenca);
  }
}
