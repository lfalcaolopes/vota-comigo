import { eq } from 'drizzle-orm';

import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';
import {
  deputadoHistorico,
  deputadoPresenca,
  partido,
  proposicaoComputavel,
  votacao,
  votacaoProposicao,
  votacaoVotos,
} from '@/shared/database/schema';

import type {
  ComputableVotacaoRow,
  DeputadoComHistoricoRow,
  DeputadoPresencaRepository,
  DeputadoPresencaRow,
} from './deputado-presenca.repository.types';

const INSERT_CHUNK_SIZE = 1000;

export function createDeputadoPresencaRepository(
  db: DrizzleDatabase,
): DeputadoPresencaRepository {
  return {
    async loadDeputadosComHistorico() {
      const rows = await db
        .select({
          deputadoId: deputadoHistorico.deputadoId,
          dataHora: deputadoHistorico.dataHora,
          situacao: deputadoHistorico.situacao,
          descricaoStatus: deputadoHistorico.descricaoStatus,
          siglaPartido: partido.sigla,
        })
        .from(deputadoHistorico)
        .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id));

      const eventosByDeputadoId = new Map<string, EventoExercicio[]>();

      for (const row of rows) {
        const evento: EventoExercicio = {
          dataHora: row.dataHora,
          situacao: row.situacao,
          descricaoStatus: row.descricaoStatus,
          partido: row.siglaPartido,
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

    async loadComputableVotacoes() {
      const rows = await db
        .selectDistinctOn([votacao.id], {
          votacaoId: votacao.id,
          dataHoraRegistro: votacao.dataHoraRegistro,
          data: votacao.data,
          votosJson: votacaoVotos.votosJson,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          votacaoProposicao,
          eq(votacaoProposicao.proposicaoId, proposicaoComputavel.proposicaoId),
        )
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .innerJoin(votacaoVotos, eq(votacaoVotos.votacaoId, votacao.id))
        .where(eq(votacao.escopoVotacao, 'plenario'))
        .orderBy(votacao.id);

      return rows.map(
        (row): ComputableVotacaoRow => ({
          votacaoId: row.votacaoId,
          dataHoraRegistro: row.dataHoraRegistro,
          data: row.data,
          votosJson: row.votosJson as Readonly<
            Record<VotoCategoria, readonly string[]>
          >,
        }),
      );
    },

    async fullReplace(rows) {
      return db.transaction(async (tx) => {
        await tx.delete(deputadoPresenca);

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(deputadoPresenca)
            .values(chunk.map(toValues))
            .returning({ id: deputadoPresenca.id });
          inserted += result.length;
        }

        return { inserted };
      });
    },
  };
}

function toValues(
  row: DeputadoPresencaRow,
): typeof deputadoPresenca.$inferInsert {
  return {
    deputadoId: row.deputadoId,
    presencas: row.presencas,
    ausenciasSemMotivoConhecido: row.ausenciasSemMotivoConhecido,
    foraDeExercicio: row.foraDeExercicio,
    lacunaDeDados: row.lacunaDeDados,
    ruleVersion: row.ruleVersion,
  };
}
