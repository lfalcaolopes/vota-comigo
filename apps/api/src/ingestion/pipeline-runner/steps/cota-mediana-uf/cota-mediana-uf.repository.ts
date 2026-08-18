import { and, asc, eq, isNotNull } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import type { GastosSigepaJson } from '@/shared/cota/reposicao-sigepa';
import {
  cotaCobertura,
  cotaMedianaUf,
  deputadoExercicioIntervalo,
  deputadoGastoCota,
  deputadoGastoCotaSigepa,
  legislatura,
} from '@/shared/database/schema';

import type { GastoCotaJson } from '../deputado-gasto-cota/deputado-gasto-cota.repository.types';
import type {
  CotaMedianaUfRepository,
  CotaMedianaUfRow,
} from './cota-mediana-uf.repository.types';

export function createCotaMedianaUfRepository(
  db: DrizzleDatabase,
): CotaMedianaUfRepository {
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

    async loadDatasInicioLegislatura() {
      const rows = await db
        .select({ dataInicio: legislatura.dataInicio })
        .from(legislatura)
        .where(isNotNull(legislatura.dataInicio));

      return rows.flatMap((row) =>
        row.dataInicio === null ? [] : [row.dataInicio],
      );
    },

    async loadGastosAnuais(year) {
      const rows = await db
        .select({
          deputadoId: deputadoGastoCota.deputadoId,
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
        .where(eq(deputadoGastoCota.year, year));

      return rows.map((row) => ({
        deputadoId: row.deputadoId,
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

    async replaceAno(year, rows) {
      return db.transaction(async (tx) => {
        await tx.delete(cotaMedianaUf).where(eq(cotaMedianaUf.year, year));

        if (rows.length === 0) {
          return { inserted: 0 };
        }

        const result = await tx
          .insert(cotaMedianaUf)
          .values(rows.map(toValues))
          .returning({ id: cotaMedianaUf.id });

        return { inserted: result.length };
      });
    },
  };
}

function toValues(row: CotaMedianaUfRow): typeof cotaMedianaUf.$inferInsert {
  return {
    year: row.year,
    siglaUf: row.siglaUf,
    valorUtilizadoMediana: row.valorUtilizadoMedianaCentavos,
    deputadoCount: row.deputadoCount,
  };
}
