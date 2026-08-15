import { and, asc, eq, notExists, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import {
  deputado,
  deputadoExercicioIntervalo,
  deputadoGastoCotaSigepa,
  legislatura,
} from '@/shared/database/schema';

import type {
  DeputadoGastoCotaSigepaRepository,
  DeputadoSemReposicao,
  GastoCotaSigepaRow,
  GastoCotaSigepaUpsertResult,
} from './deputado-gasto-cota-sigepa.repository.types';

export function createDeputadoGastoCotaSigepaRepository(
  db: DrizzleDatabase,
): DeputadoGastoCotaSigepaRepository {
  return {
    async loadDeputadosSemReposicao(year) {
      const rows = await db
        .select({
          deputadoId: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
          openedAt: deputadoExercicioIntervalo.openedAt,
          closedAt: deputadoExercicioIntervalo.closedAt,
        })
        .from(deputado)
        .innerJoin(
          deputadoExercicioIntervalo,
          eq(deputadoExercicioIntervalo.deputadoId, deputado.id),
        )
        // A linha (deputado_id, year) é o sinal de já consultado, então o
        // pendente sai do anti-join, sem estado novo (ADR 022).
        .where(
          notExists(
            db
              .select({ one: sql`1` })
              .from(deputadoGastoCotaSigepa)
              .where(
                and(
                  eq(deputadoGastoCotaSigepa.deputadoId, deputado.id),
                  eq(deputadoGastoCotaSigepa.year, year),
                ),
              ),
          ),
        )
        .orderBy(asc(deputado.externalIdDeputado));

      const byDeputadoId = new Map<string, DeputadoSemReposicao>();

      for (const row of rows) {
        const intervalo: IntervaloExercicio = {
          openedAt: row.openedAt,
          closedAt: row.closedAt,
        };
        const existing = byDeputadoId.get(row.deputadoId);

        if (existing === undefined) {
          byDeputadoId.set(row.deputadoId, {
            deputadoId: row.deputadoId,
            externalIdDeputado: row.externalIdDeputado,
            intervalos: [intervalo],
          });
          continue;
        }

        byDeputadoId.set(row.deputadoId, {
          ...existing,
          intervalos: [...existing.intervalos, intervalo],
        });
      }

      return [...byDeputadoId.values()];
    },

    async loadLegislaturas() {
      return db
        .select({
          externalIdLegislatura: legislatura.externalIdLegislatura,
          dataInicio: legislatura.dataInicio,
          dataFim: legislatura.dataFim,
        })
        .from(legislatura)
        .orderBy(asc(legislatura.externalIdLegislatura));
    },

    async upsert(rows): Promise<GastoCotaSigepaUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      // Uma transação por lote: a atomicidade é do deputado-ano, e o que já
      // fechou sobrevive a uma interrupção no lote seguinte.
      return db.transaction(async (tx) => {
        const result = await tx
          .insert(deputadoGastoCotaSigepa)
          .values(rows.map(toValues))
          .onConflictDoUpdate({
            target: [
              deputadoGastoCotaSigepa.deputadoId,
              deputadoGastoCotaSigepa.year,
            ],
            set: { gastosJson: sql`excluded.gastos_json` },
          })
          .returning({ inserted: sql<boolean>`xmax = 0` });

        const inserted = result.filter((row) => row.inserted).length;

        return { inserted, updated: result.length - inserted };
      });
    },
  };
}

function toValues(
  row: GastoCotaSigepaRow,
): typeof deputadoGastoCotaSigepa.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    year: row.year,
    gastosJson: row.gastosJson,
  };
}
