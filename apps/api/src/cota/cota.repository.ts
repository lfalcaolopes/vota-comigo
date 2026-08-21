import { and, asc, inArray, isNotNull } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  cotaCategoria,
  cotaCobertura,
  deputadoGastoCota,
  deputadoGastoCotaSigepa,
  legislatura,
} from '@/shared/database/schema';
import type {
  GastosCotaJson,
  GastosSigepaJson,
} from '@/shared/cota/reposicao-sigepa';
import type {
  UsoCotaCobertura,
  UsoCotaLegislatura,
} from '@/shared/cota/uso-cota';

import type {
  CotaCategoria,
  CotaGastoAno,
  CotaGastoSigepaAno,
} from './types/cota.types';

export const COTA_REPOSITORY = Symbol('COTA_REPOSITORY');

export interface CotaRepository {
  loadLegislaturas(): Promise<readonly UsoCotaLegislatura[]>;
  loadCoberturas(): Promise<readonly UsoCotaCobertura[]>;
  loadCategorias(): Promise<readonly CotaCategoria[]>;
  loadGastos(years: readonly number[]): Promise<readonly CotaGastoAno[]>;
  loadGastosSigepa(
    years: readonly number[],
  ): Promise<readonly CotaGastoSigepaAno[]>;
}

export function createCotaRepository(db: DrizzleDatabase): CotaRepository {
  return {
    async loadLegislaturas() {
      const rows = await db
        .select({
          legislatura: legislatura.externalIdLegislatura,
          dataInicio: legislatura.dataInicio,
          dataFim: legislatura.dataFim,
        })
        .from(legislatura)
        .where(
          and(
            isNotNull(legislatura.dataInicio),
            isNotNull(legislatura.dataFim),
          ),
        )
        .orderBy(asc(legislatura.externalIdLegislatura));

      return rows.flatMap((row) =>
        row.dataInicio === null || row.dataFim === null
          ? []
          : [
              {
                legislatura: row.legislatura,
                dataInicio: row.dataInicio,
                dataFim: row.dataFim,
              },
            ],
      );
    },

    async loadCoberturas() {
      return db
        .select({
          year: cotaCobertura.year,
          coveredThroughMonth: cotaCobertura.coveredThroughMonth,
          sigepaReposto: cotaCobertura.sigepaReposto,
          sigepaCoveredThroughMonth: cotaCobertura.sigepaCoveredThroughMonth,
        })
        .from(cotaCobertura)
        .orderBy(asc(cotaCobertura.year));
    },

    async loadCategorias() {
      return db
        .select({
          externalNumSubCota: cotaCategoria.externalNumSubCota,
          description: cotaCategoria.descricao,
        })
        .from(cotaCategoria)
        .orderBy(asc(cotaCategoria.externalNumSubCota));
    },

    async loadGastos(years) {
      if (years.length === 0) return [];
      const rows = await db
        .select({
          deputadoId: deputadoGastoCota.deputadoId,
          year: deputadoGastoCota.year,
          gastosJson: deputadoGastoCota.gastosJson,
        })
        .from(deputadoGastoCota)
        .where(inArray(deputadoGastoCota.year, [...years]));

      return rows.map((row) => ({
        deputadoId: row.deputadoId,
        year: row.year,
        gastosJson: row.gastosJson as GastosCotaJson,
      }));
    },

    async loadGastosSigepa(years) {
      if (years.length === 0) return [];
      const rows = await db
        .select({
          deputadoId: deputadoGastoCotaSigepa.deputadoId,
          year: deputadoGastoCotaSigepa.year,
          gastosJson: deputadoGastoCotaSigepa.gastosJson,
        })
        .from(deputadoGastoCotaSigepa)
        .where(inArray(deputadoGastoCotaSigepa.year, [...years]));

      return rows.map((row) => ({
        deputadoId: row.deputadoId,
        year: row.year,
        gastosJson: row.gastosJson as GastosSigepaJson,
      }));
    },
  };
}
