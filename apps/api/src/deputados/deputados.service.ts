import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  DeputadoPerfil,
  DeputadosFeedResponse,
  UfsDisponiveisResponse,
} from '@vota-comigo/shared-types';

import { toDeputadoCard } from './mappers/deputado-card.mapper';
import { toDeputadoPerfil } from './mappers/deputado-perfil.mapper';
import {
  DEPUTADOS_REPOSITORY,
  type DeputadosRepository,
} from './deputados.repository';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
}

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
  ): Promise<DeputadosFeedResponse> {
    const rows = await this.repository.loadDeputadosFeed();
    const cards = rows.map(toDeputadoCard);
    const normalizedQuery =
      q === undefined ? undefined : normalizeSearchText(q.trim());
    const searchFiltered =
      normalizedQuery === undefined || normalizedQuery.length === 0
        ? cards
        : cards.filter((card) =>
            [card.nomePublico, card.nomeCivil].some((value) =>
              value === null
                ? false
                : normalizeSearchText(value).includes(normalizedQuery),
            ),
          );
    const filtered =
      emAtividade === true
        ? searchFiltered.filter((card) => card.emAtividade)
        : searchFiltered;
    const ufFiltered =
      uf === undefined
        ? filtered
        : filtered.filter((card) => card.siglaUf === uf);

    return {
      items: ufFiltered.slice(offset, offset + limit),
      total: ufFiltered.length,
      limit,
      offset,
    };
  }

  async ufsDisponiveis(): Promise<UfsDisponiveisResponse> {
    const rows = await this.repository.loadDeputadosFeed();
    const siglas = new Set(
      rows
        .map(toDeputadoCard)
        .map((card) => card.siglaUf)
        .filter((siglaUf): siglaUf is string => siglaUf !== null),
    );
    return {
      items: [...siglas].sort().map((siglaUf) => ({ siglaUf })),
    };
  }

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
