import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoHistorico,
  legislatura,
  partido,
  proposicaoComputavel,
  votacao,
  votacaoProposicao,
  votacaoVotos,
} from '@/shared/database/schema';

import type {
  DeputadoHistoricoEventoSource,
  DeputadoLegislaturaPeriodoSource,
  DeputadoPerfilSource,
  VotacaoProposicaoComputavelRow,
} from './types/deputados.types';

export const DEPUTADOS_REPOSITORY = Symbol('DEPUTADOS_REPOSITORY');

export interface DeputadosRepository {
  loadDeputadosFeed(): Promise<readonly DeputadoPerfilSource[]>;
  loadDeputadoPerfil(
    externalIdDeputado: number,
  ): Promise<DeputadoPerfilSource | null>;
  loadVotacoesProposicoesComputaveisForDeputado(
    deputadoId: string,
  ): Promise<VotacaoProposicaoComputavelRow[]>;
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

function toLegislaturaPeriodoSource(
  dataInicio: string | null,
  dataFim: string | null,
): DeputadoLegislaturaPeriodoSource | null {
  if (dataInicio === null || dataFim === null) {
    return null;
  }

  return { dataInicio, dataFim };
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
        legislaturaInicialPeriodo: null,
        legislaturaFinalPeriodo: null,
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
          legislaturaInicialDataInicio: legislaturaInicial.dataInicio,
          legislaturaInicialDataFim: legislaturaInicial.dataFim,
          legislaturaFinalDataInicio: legislaturaFinal.dataInicio,
          legislaturaFinalDataFim: legislaturaFinal.dataFim,
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
        legislaturaInicialPeriodo: toLegislaturaPeriodoSource(
          row.legislaturaInicialDataInicio,
          row.legislaturaInicialDataFim,
        ),
        legislaturaFinalPeriodo: toLegislaturaPeriodoSource(
          row.legislaturaFinalDataInicio,
          row.legislaturaFinalDataFim,
        ),
        eventos: await loadEventosByDeputadoId(row.id),
      };
    },

    async loadVotacoesProposicoesComputaveisForDeputado(deputadoId) {
      const rows = await db
        .select({
          votacaoId: votacao.id,
          dataHoraRegistro: votacao.dataHoraRegistro,
          data: votacao.data,
          votosJson: votacaoVotos.votosJson,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          votacaoProposicao,
          eq(votacaoProposicao.proposicaoId, proposicaoComputavel.proposicaoId),
        )
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .innerJoin(votacaoVotos, eq(votacaoVotos.votacaoId, votacao.id))
        .where(eq(votacao.escopoVotacao, 'plenario'));

      const byVotacaoId = new Map<
        (typeof rows)[number]['votacaoId'],
        (typeof rows)[number]
      >();
      for (const row of rows) {
        byVotacaoId.set(row.votacaoId, row);
      }

      return [...byVotacaoId.values()].map((row) => {
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
