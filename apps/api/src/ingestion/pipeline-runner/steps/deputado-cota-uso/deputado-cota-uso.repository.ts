import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  cotaCobertura,
  deputado,
  deputadoCotaUso,
  deputadoExercicioIntervalo,
  deputadoGastoCota,
  deputadoGastoCotaSigepa,
  deputadoHistorico,
  legislatura,
} from '@/shared/database/schema';
import type {
  GastosCotaJson,
  GastosSigepaJson,
} from '@/shared/cota/reposicao-sigepa';

import type {
  DeputadoCotaUsoRepository,
  DeputadoCotaUsoRow,
} from './deputado-cota-uso.repository.types';

export function createDeputadoCotaUsoRepository(
  db: DrizzleDatabase,
): DeputadoCotaUsoRepository {
  return {
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
        );
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

    async loadDeputados() {
      const deputadoRows = await db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
        })
        .from(deputado)
        .orderBy(asc(deputado.id));
      const ids = deputadoRows.map((row) => row.id);
      if (ids.length === 0) return [];

      const [intervaloRows, gastoRows, historicoRows] = await Promise.all([
        db
          .select({
            deputadoId: deputadoExercicioIntervalo.deputadoId,
            openedAt: deputadoExercicioIntervalo.openedAt,
            closedAt: deputadoExercicioIntervalo.closedAt,
          })
          .from(deputadoExercicioIntervalo)
          .where(inArray(deputadoExercicioIntervalo.deputadoId, ids))
          .orderBy(asc(deputadoExercicioIntervalo.openedAt)),
        db
          .select({
            deputadoId: deputadoGastoCota.deputadoId,
            year: deputadoGastoCota.year,
            gastosJson: deputadoGastoCota.gastosJson,
            gastosSigepaJson: deputadoGastoCotaSigepa.gastosJson,
          })
          .from(deputadoGastoCota)
          .leftJoin(
            deputadoGastoCotaSigepa,
            and(
              eq(
                deputadoGastoCotaSigepa.deputadoId,
                deputadoGastoCota.deputadoId,
              ),
              eq(deputadoGastoCotaSigepa.year, deputadoGastoCota.year),
            ),
          )
          .where(inArray(deputadoGastoCota.deputadoId, ids)),
        db
          .select({
            deputadoId: deputadoHistorico.deputadoId,
            dataHora: deputadoHistorico.dataHora,
            siglaUf: deputadoHistorico.siglaUf,
          })
          .from(deputadoHistorico)
          .where(inArray(deputadoHistorico.deputadoId, ids))
          .orderBy(
            asc(deputadoHistorico.deputadoId),
            asc(deputadoHistorico.dataHora),
          ),
      ]);

      return deputadoRows.map((row) => {
        const historico = historicoRows.filter(
          (item) => item.deputadoId === row.id,
        );
        return {
          deputadoId: row.id,
          externalIdDeputado: row.externalIdDeputado,
          intervalosExercicio: intervaloRows
            .filter((item) => item.deputadoId === row.id)
            .map(({ openedAt, closedAt }) => ({ openedAt, closedAt })),
          gastos: gastoRows
            .filter((item) => item.deputadoId === row.id)
            .map((item) => ({
              year: item.year,
              gastosJson: item.gastosJson as GastosCotaJson,
              gastosSigepaJson:
                (item.gastosSigepaJson as GastosSigepaJson) ?? null,
            })),
          ufs: historico.map((item, index) => ({
            dataInicio: item.dataHora,
            dataFim: historico[index + 1]?.dataHora ?? null,
            siglaUf: item.siglaUf,
          })),
        };
      });
    },

    async replaceAll(rows) {
      return db.transaction(async (tx) => {
        await tx.delete(deputadoCotaUso);
        if (rows.length === 0) return { inserted: 0 };
        const result = await tx
          .insert(deputadoCotaUso)
          .values(rows.map(toValues))
          .returning({ id: deputadoCotaUso.id });
        return { inserted: result.length };
      });
    },
  };
}

function toValues(
  row: DeputadoCotaUsoRow,
): typeof deputadoCotaUso.$inferInsert {
  if (row.apuracao.status === 'calculavel') {
    return {
      deputadoId: row.deputadoId,
      status: row.apuracao.status,
      motivo: null,
      legislatura: row.apuracao.legislatura,
      percentualTetoBase: row.apuracao.percentualTetoBase,
      gastoCents: row.apuracao.gastoCents,
      tetoBaseCents: row.apuracao.tetoBaseCents,
      periodStart: row.apuracao.periodStart,
      diasEmExercicio: row.apuracao.diasEmExercicio,
      coberturaAte: row.apuracao.coberturaAte,
      referencia: row.referencia,
    };
  }
  return {
    deputadoId: row.deputadoId,
    status: row.apuracao.status,
    motivo: row.apuracao.motivo,
    legislatura: row.apuracao.legislatura,
    percentualTetoBase: null,
    gastoCents: row.apuracao.gastoCents,
    tetoBaseCents: row.apuracao.tetoBaseCents,
    periodStart: row.apuracao.periodStart,
    diasEmExercicio: row.apuracao.diasEmExercicio,
    coberturaAte: row.apuracao.coberturaAte,
    referencia: row.referencia,
  };
}
