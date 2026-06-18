import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoHistorico,
  legislatura,
  partido,
  votacao,
  votacaoVotos,
} from '@/shared/database/schema';

import type {
  DeputadoHistoricoEventoSource,
  DeputadoPerfilSource,
  VotacaoPlenarioRow,
} from './types/deputados.types';

export const DEPUTADOS_REPOSITORY = Symbol('DEPUTADOS_REPOSITORY');

export interface DeputadosRepository {
  loadDeputadosFeed(): Promise<readonly DeputadoPerfilSource[]>;
  loadDeputadoPerfil(
    externalIdDeputado: number,
  ): Promise<DeputadoPerfilSource | null>;
  loadVotacoesPlenarioForDeputado(
    deputadoId: string,
  ): Promise<VotacaoPlenarioRow[]>;
}

function invertVotos(
  votosJson: Record<VotoCategoria, readonly string[]>,
): ReadonlyMap<string, VotoCategoria> {
  const votosByDeputado = new Map<string, VotoCategoria>();
  for (const categoria of Object.keys(votosJson) as VotoCategoria[]) {
    for (const deputadoId of votosJson[categoria]) {
      votosByDeputado.set(deputadoId, categoria);
    }
  }
  return votosByDeputado;
}

export function createDeputadosRepository(
  db: DrizzleDatabase,
): DeputadosRepository {
  async function loadEventosByDeputadoId(deputadoId: string) {
    return db
      .select({
        dataHora: deputadoHistorico.dataHora,
        situacao: deputadoHistorico.situacao,
        descricaoStatus: deputadoHistorico.descricaoStatus,
        nomeEleitoral: deputadoHistorico.nomeEleitoral,
        siglaUf: deputadoHistorico.siglaUf,
        urlFoto: deputadoHistorico.urlFoto,
        siglaPartido: partido.sigla,
      })
      .from(deputadoHistorico)
      .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
      .where(eq(deputadoHistorico.deputadoId, deputadoId));
  }

  async function loadEventosByDeputadoIds(deputadoIds: readonly string[]) {
    const byDeputadoId = new Map<string, DeputadoHistoricoEventoSource[]>();
    if (deputadoIds.length === 0) return byDeputadoId;

    const eventos = await db
      .select({
        deputadoId: deputadoHistorico.deputadoId,
        dataHora: deputadoHistorico.dataHora,
        situacao: deputadoHistorico.situacao,
        descricaoStatus: deputadoHistorico.descricaoStatus,
        nomeEleitoral: deputadoHistorico.nomeEleitoral,
        siglaUf: deputadoHistorico.siglaUf,
        urlFoto: deputadoHistorico.urlFoto,
        siglaPartido: partido.sigla,
      })
      .from(deputadoHistorico)
      .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
      .where(inArray(deputadoHistorico.deputadoId, deputadoIds));

    for (const evento of eventos) {
      const { deputadoId, ...source } = evento;
      byDeputadoId.set(deputadoId, [
        ...(byDeputadoId.get(deputadoId) ?? []),
        source,
      ]);
    }
    return byDeputadoId;
  }

  return {
    async loadDeputadosFeed() {
      const rows = await db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          dataNascimento: deputado.dataNascimento,
          municipioNascimento: deputado.municipioNascimento,
          ufNascimento: deputado.ufNascimento,
          urlRedeSocial: deputado.urlRedeSocial,
        })
        .from(deputado);

      const eventosByDeputadoId = await loadEventosByDeputadoIds(
        rows.map((row) => row.id),
      );

      return rows.map((row) => ({
        id: row.id,
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        dataNascimento: row.dataNascimento,
        municipioNascimento: row.municipioNascimento,
        ufNascimento: row.ufNascimento,
        urlRedeSocial: row.urlRedeSocial,
        externalIdLegislaturaInicial: null,
        externalIdLegislaturaFinal: null,
        eventos: eventosByDeputadoId.get(row.id) ?? [],
      }));
    },

    async loadDeputadoPerfil(externalIdDeputado) {
      const legislaturaInicial = alias(legislatura, 'legislatura_inicial');
      const legislaturaFinal = alias(legislatura, 'legislatura_final');

      const [row] = await db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          dataNascimento: deputado.dataNascimento,
          municipioNascimento: deputado.municipioNascimento,
          ufNascimento: deputado.ufNascimento,
          urlRedeSocial: deputado.urlRedeSocial,
          externalIdLegislaturaInicial:
            legislaturaInicial.externalIdLegislatura,
          externalIdLegislaturaFinal: legislaturaFinal.externalIdLegislatura,
        })
        .from(deputado)
        .leftJoin(
          legislaturaInicial,
          eq(deputado.legislaturaInicialId, legislaturaInicial.id),
        )
        .leftJoin(
          legislaturaFinal,
          eq(deputado.legislaturaFinalId, legislaturaFinal.id),
        )
        .where(eq(deputado.externalIdDeputado, externalIdDeputado))
        .limit(1);

      if (row === undefined) {
        return null;
      }

      return {
        id: row.id,
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        dataNascimento: row.dataNascimento,
        municipioNascimento: row.municipioNascimento,
        ufNascimento: row.ufNascimento,
        urlRedeSocial: row.urlRedeSocial,
        externalIdLegislaturaInicial: row.externalIdLegislaturaInicial ?? null,
        externalIdLegislaturaFinal: row.externalIdLegislaturaFinal ?? null,
        eventos: await loadEventosByDeputadoId(row.id),
      };
    },

    async loadVotacoesPlenarioForDeputado(deputadoId) {
      const rows = await db
        .select({
          dataHoraRegistro: votacao.dataHoraRegistro,
          data: votacao.data,
          votosJson: votacaoVotos.votosJson,
        })
        .from(votacao)
        .innerJoin(votacaoVotos, eq(votacaoVotos.votacaoId, votacao.id))
        .where(eq(votacao.escopoVotacao, 'plenario'));

      return rows.map((row) => {
        const votos = invertVotos(
          row.votosJson as Record<VotoCategoria, string[]>,
        );
        return {
          dataHoraRegistro: row.dataHoraRegistro,
          data: row.data,
          voto: votos.get(deputadoId) ?? null,
        };
      });
    },
  };
}
