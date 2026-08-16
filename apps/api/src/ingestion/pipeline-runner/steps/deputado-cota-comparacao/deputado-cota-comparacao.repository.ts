import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import type { DrizzleDatabase } from '@/shared/database/client';
import type { GastosSigepaJson } from '@/shared/cota/reposicao-sigepa';
import {
  cotaCobertura,
  cotaMedianaUf,
  deputado,
  deputadoCotaComparacao,
  deputadoExercicioIntervalo,
  deputadoGastoCota,
  deputadoGastoCotaSigepa,
  legislatura,
} from '@/shared/database/schema';

import type { GastoCotaJson } from '../deputado-gasto-cota/deputado-gasto-cota.repository.types';

import type {
  DeputadoCotaComparacaoRepository,
  DeputadoCotaComparacaoRow,
} from './deputado-cota-comparacao.repository.types';

export function createDeputadoCotaComparacaoRepository(
  db: DrizzleDatabase,
): DeputadoCotaComparacaoRepository {
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

    async loadDeputados() {
      const rows = await db
        .select({
          deputadoId: deputado.id,
          legislaturaFinal: legislatura.externalIdLegislatura,
          dataInicio: legislatura.dataInicio,
          dataFim: legislatura.dataFim,
        })
        .from(deputado)
        .leftJoin(legislatura, eq(legislatura.id, deputado.legislaturaFinalId))
        .orderBy(asc(deputado.id));

      return rows.map((row) => ({
        deputadoId: row.deputadoId,
        legislaturaFinal: row.legislaturaFinal ?? null,
        legislaturaFinalPeriodo:
          row.dataInicio === null || row.dataFim === null
            ? null
            : { dataInicio: row.dataInicio, dataFim: row.dataFim },
      }));
    },

    async loadGastos(deputadoIds) {
      if (deputadoIds.length === 0) {
        return [];
      }

      const rows = await db
        .select({
          deputadoId: deputadoGastoCota.deputadoId,
          year: deputadoGastoCota.year,
          siglaUf: deputadoGastoCota.siglaUf,
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
        .where(inArray(deputadoGastoCota.deputadoId, [...deputadoIds]));

      return rows.map((row) => ({
        deputadoId: row.deputadoId,
        year: row.year,
        siglaUf: row.siglaUf,
        gastosJson: row.gastosJson as GastoCotaJson,
        gastosSigepaJson: (row.gastosSigepaJson as GastosSigepaJson) ?? null,
      }));
    },

    async loadIntervalosByDeputadoId() {
      const rows = await db
        .select({
          deputadoId: deputadoExercicioIntervalo.deputadoId,
          openedAt: deputadoExercicioIntervalo.openedAt,
          closedAt: deputadoExercicioIntervalo.closedAt,
        })
        .from(deputadoExercicioIntervalo);

      const intervalosByDeputadoId = new Map<string, IntervaloExercicio[]>();

      for (const row of rows) {
        const intervalo: IntervaloExercicio = {
          openedAt: row.openedAt,
          closedAt: row.closedAt,
        };
        const existing = intervalosByDeputadoId.get(row.deputadoId);
        if (existing === undefined) {
          intervalosByDeputadoId.set(row.deputadoId, [intervalo]);
        } else {
          existing.push(intervalo);
        }
      }

      return intervalosByDeputadoId;
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

    async loadMedianas() {
      return db
        .select({
          year: cotaMedianaUf.year,
          siglaUf: cotaMedianaUf.siglaUf,
          amountUsedCents: cotaMedianaUf.valorUtilizadoMediana,
          deputadoCount: cotaMedianaUf.deputadoCount,
        })
        .from(cotaMedianaUf);
    },

    async replaceAll(rows) {
      return db.transaction(async (tx) => {
        await tx.delete(deputadoCotaComparacao);

        if (rows.length === 0) {
          return { inserted: 0 };
        }

        const result = await tx
          .insert(deputadoCotaComparacao)
          .values(rows.map(toValues))
          .returning({ id: deputadoCotaComparacao.id });

        return { inserted: result.length };
      });
    },
  };
}

function toValues(
  row: DeputadoCotaComparacaoRow,
): typeof deputadoCotaComparacao.$inferInsert {
  const { cota } = row;
  const comparavel = cota.status === 'comparavel';

  return {
    deputadoId: row.deputadoId,
    legislatura: row.legislatura,
    status: cota.status,
    motivo: comparavel ? null : cota.motivo,
    percentualSobreMedianaUf: comparavel ? cota.percentualSobreMedianaUf : null,
    gastoNaComparacaoCents: comparavel ? cota.gastoNaComparacaoCents : null,
    medianaNaComparacaoCents: comparavel ? cota.medianaNaComparacaoCents : null,
    tetoNaComparacaoCents: comparavel ? cota.tetoNaComparacaoCents : null,
    siglaUf: comparavel ? cota.siglaUf : null,
    anosNaComparacao: comparavel ? cota.anosNaComparacao : null,
    diasEmExercicio: comparavel ? cota.diasEmExercicio : null,
    diasNaComparacao: comparavel ? cota.diasNaComparacao : null,
    anosJson: cota.anos,
    referencia: row.referencia,
  };
}
