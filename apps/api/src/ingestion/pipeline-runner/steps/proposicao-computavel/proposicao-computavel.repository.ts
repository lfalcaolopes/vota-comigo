import { eq } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  proposicao,
  proposicaoComputavel,
  votacao,
  votacaoProposicao,
} from '@/shared/database/schema';
import type {
  ProposicaoComputavelRepository,
  ProposicaoComputavelRow,
} from './proposicao-computavel.repository.types';

const INSERT_CHUNK_SIZE = 1000;

export function createProposicaoComputavelRepository(
  db: DrizzleDatabase,
): ProposicaoComputavelRepository {
  return {
    async loadCandidates() {
      return db
        .select({
          proposicaoId: proposicao.id,
          votacaoId: votacao.id,
          externalIdVotacao: votacao.externalIdVotacao,
          data: votacao.data,
          dataHoraRegistro: votacao.dataHoraRegistro,
          descricao: votacao.descricao,
          ultimaAberturaVotacaoDescricao:
            votacao.ultimaAberturaVotacaoDescricao,
          ultimaApresentacaoProposicaoDescricao:
            votacao.ultimaApresentacaoProposicaoDescricao,
          votosSim: votacao.votosSim,
          votosNao: votacao.votosNao,
          votosOutros: votacao.votosOutros,
          aprovacao: votacao.aprovacao,
        })
        .from(votacaoProposicao)
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .innerJoin(
          proposicao,
          eq(votacaoProposicao.proposicaoId, proposicao.id),
        )
        .where(eq(votacao.escopoVotacao, 'plenario'));
    },

    async fullReplace(rows) {
      return db.transaction(async (tx) => {
        await tx.delete(proposicaoComputavel);

        let inserted = 0;
        for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
          const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
          const result = await tx
            .insert(proposicaoComputavel)
            .values(chunk.map(toValues))
            .returning({ id: proposicaoComputavel.id });
          inserted += result.length;
        }

        return { inserted };
      });
    },
  };
}

function toValues(
  row: ProposicaoComputavelRow,
): typeof proposicaoComputavel.$inferInsert {
  return {
    proposicaoId: row.proposicaoId,
    votacaoReferenciaId: row.votacaoReferenciaId,
    votacaoReferenciaPattern: row.votacaoReferenciaPattern,
    volumeVotacoesPlenario: row.volumeVotacoesPlenario,
    dataUltimaVotacao: row.dataUltimaVotacao,
    ruleVersion: row.ruleVersion,
  };
}
