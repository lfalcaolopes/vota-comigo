import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoHistorico,
  legislatura,
  partido,
} from '@/shared/database/schema';

import type { DeputadoPerfilSource } from './types/deputados.types';

export const DEPUTADOS_REPOSITORY = Symbol('DEPUTADOS_REPOSITORY');

export interface DeputadosRepository {
  loadDeputadoPerfil(
    externalIdDeputado: number,
  ): Promise<DeputadoPerfilSource | null>;
}

export function createDeputadosRepository(
  db: DrizzleDatabase,
): DeputadosRepository {
  return {
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

      const eventos = await db
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
        .where(eq(deputadoHistorico.deputadoId, row.id));

      return {
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        dataNascimento: row.dataNascimento,
        municipioNascimento: row.municipioNascimento,
        ufNascimento: row.ufNascimento,
        urlRedeSocial: row.urlRedeSocial,
        externalIdLegislaturaInicial: row.externalIdLegislaturaInicial ?? null,
        externalIdLegislaturaFinal: row.externalIdLegislaturaFinal ?? null,
        eventos,
      };
    },
  };
}
