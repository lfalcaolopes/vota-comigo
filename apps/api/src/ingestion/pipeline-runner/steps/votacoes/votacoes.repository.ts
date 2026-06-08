import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { votacao } from '@/shared/database/schema';
import type {
  VotacaoRepository,
  VotacaoRow,
  VotacaoUpsertResult,
} from './votacoes.repository.types';

export function createVotacaoRepository(
  db: DrizzleDatabase,
): VotacaoRepository {
  return {
    async upsert(rows): Promise<VotacaoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(votacao)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: votacao.externalIdVotacao,
          set: {
            uri: sql`excluded.uri`,
            data: sql`excluded.data`,
            dataHoraRegistro: sql`excluded.data_hora_registro`,
            externalIdOrgao: sql`excluded.external_id_orgao`,
            siglaOrgao: sql`excluded.sigla_orgao`,
            escopoVotacao: sql`excluded.escopo_votacao`,
            externalIdEvento: sql`excluded.external_id_evento`,
            aprovacao: sql`excluded.aprovacao`,
            votosSim: sql`excluded.votos_sim`,
            votosNao: sql`excluded.votos_nao`,
            votosOutros: sql`excluded.votos_outros`,
            descricao: sql`excluded.descricao`,
            ultimaAberturaVotacaoDataHoraRegistro: sql`excluded.ultima_abertura_votacao_data_hora_registro`,
            ultimaAberturaVotacaoDescricao: sql`excluded.ultima_abertura_votacao_descricao`,
            ultimaApresentacaoProposicaoDataHoraRegistro: sql`excluded.ultima_apresentacao_proposicao_data_hora_registro`,
            ultimaApresentacaoProposicaoDescricao: sql`excluded.ultima_apresentacao_proposicao_descricao`,
            externalIdProposicaoUltimaApresentacao: sql`excluded.external_id_proposicao_ultima_apresentacao`,
            uriProposicaoUltimaApresentacao: sql`excluded.uri_proposicao_ultima_apresentacao`,
          },
        })
        .returning({ inserted: sql<boolean>`xmax = 0` });

      const inserted = result.filter((row) => row.inserted).length;

      return {
        inserted,
        updated: result.length - inserted,
      };
    },
  };
}

function toValues(row: VotacaoRow): typeof votacao.$inferInsert {
  return {
    externalIdVotacao: row.externalIdVotacao,
    uri: row.uri,
    data: row.data,
    dataHoraRegistro: row.dataHoraRegistro,
    externalIdOrgao: row.externalIdOrgao,
    siglaOrgao: row.siglaOrgao,
    escopoVotacao: row.escopoVotacao,
    externalIdEvento: row.externalIdEvento,
    aprovacao: row.aprovacao,
    votosSim: row.votosSim,
    votosNao: row.votosNao,
    votosOutros: row.votosOutros,
    descricao: row.descricao,
    ultimaAberturaVotacaoDataHoraRegistro:
      row.ultimaAberturaVotacaoDataHoraRegistro,
    ultimaAberturaVotacaoDescricao: row.ultimaAberturaVotacaoDescricao,
    ultimaApresentacaoProposicaoDataHoraRegistro:
      row.ultimaApresentacaoProposicaoDataHoraRegistro,
    ultimaApresentacaoProposicaoDescricao:
      row.ultimaApresentacaoProposicaoDescricao,
    externalIdProposicaoUltimaApresentacao:
      row.externalIdProposicaoUltimaApresentacao,
    uriProposicaoUltimaApresentacao: row.uriProposicaoUltimaApresentacao,
  };
}
