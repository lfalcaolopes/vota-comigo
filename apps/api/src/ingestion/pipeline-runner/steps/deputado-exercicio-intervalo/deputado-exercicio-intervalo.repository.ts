import type { DrizzleDatabase } from '@/shared/database/client';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';
import {
  deputadoExercicioIntervalo,
  deputadoHistorico,
} from '@/shared/database/schema';

import type {
  DeputadoComHistoricoRow,
  DeputadoExercicioIntervaloRepository,
  DeputadoExercicioIntervaloRow,
} from './deputado-exercicio-intervalo.repository.types';

const INSERT_CHUNK_SIZE = 1000;

export function createDeputadoExercicioIntervaloRepository(
  db: DrizzleDatabase,
): DeputadoExercicioIntervaloRepository {
  return {
    async loadDeputadosComHistorico() {
      const rows = await db
        .select({
          deputadoId: deputadoHistorico.deputadoId,
          dataHora: deputadoHistorico.dataHora,
          situacao: deputadoHistorico.situacao,
          descricaoStatus: deputadoHistorico.descricaoStatus,
        })
        .from(deputadoHistorico);

      const eventosByDeputadoId = new Map<string, EventoExercicio[]>();

      for (const row of rows) {
        const evento: EventoExercicio = {
          dataHora: row.dataHora,
          situacao: row.situacao,
          descricaoStatus: row.descricaoStatus,
          partido: null,
        };
        const existing = eventosByDeputadoId.get(row.deputadoId);
        if (existing === undefined) {
          eventosByDeputadoId.set(row.deputadoId, [evento]);
        } else {
          existing.push(evento);
        }
      }

      return [...eventosByDeputadoId.entries()].map(
        ([deputadoId, eventos]): DeputadoComHistoricoRow => ({
          deputadoId,
          eventos,
        }),
      );
    },

    async fullReplace(rows) {
      return db.transaction(async (tx) => {
        await tx.delete(deputadoExercicioIntervalo);

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(deputadoExercicioIntervalo)
            .values(chunk.map(toValues))
            .returning({ id: deputadoExercicioIntervalo.id });
          inserted += result.length;
        }

        return { inserted };
      });
    },
  };
}

function toValues(
  row: DeputadoExercicioIntervaloRow,
): typeof deputadoExercicioIntervalo.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    ruleVersion: row.ruleVersion,
  };
}
