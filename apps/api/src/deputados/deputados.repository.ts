import { and, desc, eq, gt, inArray, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoHistorico,
  deputadoPresenca,
  legislatura,
  partido,
} from '@/shared/database/schema';

import type {
  DeputadoHistoricoEventoSource,
  DeputadoLegislaturaPeriodoSource,
  DeputadoPerfilSource,
  DeputadoResumoPresencaRow,
} from './types/deputados.types';

export const DEPUTADOS_REPOSITORY = Symbol('DEPUTADOS_REPOSITORY');

export interface DeputadosRepository {
  loadDeputadosFeed(): Promise<readonly DeputadoPerfilSource[]>;
  loadUfsDisponiveis(): Promise<readonly string[]>;
  loadPartidosDisponiveis(): Promise<readonly string[]>;
  loadDeputadoPerfil(
    externalIdDeputado: number,
  ): Promise<DeputadoPerfilSource | null>;
  loadResumoPresenca(
    deputadoId: string,
  ): Promise<DeputadoResumoPresencaRow | null>;
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
        .from(deputado)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, deputado.id),
            gt(deputadoPresenca.presencas, 0),
          ),
        );

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

    async loadUfsDisponiveis() {
      const maisRecente = db
        .selectDistinctOn([deputadoHistorico.deputadoId], {
          siglaUf: deputadoHistorico.siglaUf,
        })
        .from(deputadoHistorico)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, deputadoHistorico.deputadoId),
            gt(deputadoPresenca.presencas, 0),
          ),
        )
        .orderBy(deputadoHistorico.deputadoId, desc(deputadoHistorico.dataHora))
        .as('mais_recente');

      const rows = await db
        .selectDistinct({ siglaUf: maisRecente.siglaUf })
        .from(maisRecente)
        .where(isNotNull(maisRecente.siglaUf));

      return rows.flatMap((row) => (row.siglaUf === null ? [] : [row.siglaUf]));
    },

    async loadPartidosDisponiveis() {
      const maisRecente = db
        .selectDistinctOn([deputadoHistorico.deputadoId], {
          deputadoId: deputadoHistorico.deputadoId,
          partidoId: deputadoHistorico.partidoId,
        })
        .from(deputadoHistorico)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, deputadoHistorico.deputadoId),
            gt(deputadoPresenca.presencas, 0),
          ),
        )
        .orderBy(deputadoHistorico.deputadoId, desc(deputadoHistorico.dataHora))
        .as('mais_recente');

      const rows = await db
        .selectDistinct({ sigla: partido.sigla })
        .from(maisRecente)
        .innerJoin(partido, eq(maisRecente.partidoId, partido.id))
        .where(isNotNull(partido.sigla));

      return rows.flatMap((row) => (row.sigla === null ? [] : [row.sigla]));
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

    async loadResumoPresenca(deputadoId) {
      const [row] = await db
        .select({
          presencas: deputadoPresenca.presencas,
          ausenciasSemMotivoConhecido:
            deputadoPresenca.ausenciasSemMotivoConhecido,
        })
        .from(deputadoPresenca)
        .where(eq(deputadoPresenca.deputadoId, deputadoId))
        .limit(1);

      return row ?? null;
    },
  };
}
