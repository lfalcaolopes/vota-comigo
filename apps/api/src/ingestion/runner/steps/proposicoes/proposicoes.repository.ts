import { sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { proposicao } from '@/shared/database/schema';
import type {
  ProposicaoRepository,
  ProposicaoRow,
  ProposicaoUpsertResult,
} from './proposicoes.repository.types';

export function createProposicaoRepository(
  db: DrizzleDatabase,
): ProposicaoRepository {
  return {
    async upsert(rows): Promise<ProposicaoUpsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const result = await db
        .insert(proposicao)
        .values(rows.map(toValues))
        .onConflictDoUpdate({
          target: proposicao.externalIdProposicao,
          set: {
            uri: sql`excluded.uri`,
            siglaTipo: sql`excluded.sigla_tipo`,
            numero: sql`excluded.numero`,
            ano: sql`excluded.ano`,
            externalCodTipo: sql`excluded.external_cod_tipo`,
            descricaoTipo: sql`excluded.descricao_tipo`,
            ementa: sql`excluded.ementa`,
            ementaDetalhada: sql`excluded.ementa_detalhada`,
            keywords: sql`excluded.keywords`,
            dataApresentacao: sql`excluded.data_apresentacao`,
            urlInteiroTeor: sql`excluded.url_inteiro_teor`,
            ultimoStatusDataHora: sql`excluded.ultimo_status_data_hora`,
            ultimoStatusSiglaOrgao: sql`excluded.ultimo_status_sigla_orgao`,
            ultimoStatusRegime: sql`excluded.ultimo_status_regime`,
            ultimoStatusDescricaoSituacao: sql`excluded.ultimo_status_descricao_situacao`,
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

function toValues(row: ProposicaoRow): typeof proposicao.$inferInsert {
  return {
    externalIdProposicao: row.externalIdProposicao,
    uri: row.uri,
    siglaTipo: row.siglaTipo,
    numero: row.numero,
    ano: row.ano,
    externalCodTipo: row.externalCodTipo,
    descricaoTipo: row.descricaoTipo,
    ementa: row.ementa,
    ementaDetalhada: row.ementaDetalhada,
    keywords: row.keywords,
    dataApresentacao: row.dataApresentacao,
    urlInteiroTeor: row.urlInteiroTeor,
    ultimoStatusDataHora: row.ultimoStatusDataHora,
    ultimoStatusSiglaOrgao: row.ultimoStatusSiglaOrgao,
    ultimoStatusRegime: row.ultimoStatusRegime,
    ultimoStatusDescricaoSituacao: row.ultimoStatusDescricaoSituacao,
  };
}
