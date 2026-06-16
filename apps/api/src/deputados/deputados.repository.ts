import { eq, exists } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { deputado, deputadoHistorico } from '@/shared/database/schema';

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
      const [row] = await db
        .select({
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          temHistoricoParlamentar: exists(
            db
              .select({ one: deputadoHistorico.id })
              .from(deputadoHistorico)
              .where(eq(deputadoHistorico.deputadoId, deputado.id)),
          ),
        })
        .from(deputado)
        .where(eq(deputado.externalIdDeputado, externalIdDeputado))
        .limit(1);

      if (row === undefined) {
        return null;
      }

      return {
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        temHistoricoParlamentar: Boolean(row.temHistoricoParlamentar),
      };
    },
  };
}
