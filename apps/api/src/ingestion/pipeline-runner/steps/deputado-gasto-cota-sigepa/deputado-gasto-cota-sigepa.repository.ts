import { and, asc, eq, notExists, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import {
  cotaCategoria,
  cotaCobertura,
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
  const selectDeputadosComIntervalo = () =>
    db
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
      );

  return {
    async loadDeputadosSemReposicao(year) {
      const rows = await selectDeputadosComIntervalo()
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

      return groupIntervalosByDeputado(rows);
    },

    async loadDeputadosElegiveis() {
      const rows = await selectDeputadosComIntervalo().orderBy(
        asc(deputado.externalIdDeputado),
      );

      return groupIntervalosByDeputado(rows);
    },

    async loadCobertura(year) {
      const [row] = await db
        .select({
          coveredThroughMonth: cotaCobertura.coveredThroughMonth,
          sigepaReposto: cotaCobertura.sigepaReposto,
        })
        .from(cotaCobertura)
        .where(eq(cotaCobertura.year, year))
        .limit(1);

      return row ?? null;
    },

    async saveAnoReposto({ year, reposto, coveredThroughMonth }) {
      await db
        .update(cotaCobertura)
        .set({
          sigepaReposto: reposto,
          sigepaCoveredThroughMonth: coveredThroughMonth,
        })
        .where(eq(cotaCobertura.year, year));
    },

    async saveCategoria({ externalNumSubCota, descricao }) {
      await db
        .insert(cotaCategoria)
        .values({ externalNumSubCota, descricao })
        .onConflictDoUpdate({
          target: cotaCategoria.externalNumSubCota,
          set: { descricao },
        });
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

type IntervaloRow = {
  deputadoId: string;
  externalIdDeputado: number;
  openedAt: string;
  closedAt: string | null;
};

function groupIntervalosByDeputado(
  rows: readonly IntervaloRow[],
): readonly DeputadoSemReposicao[] {
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
