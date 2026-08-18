import { date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';
import { legislatura } from './legislatura';
import { orgao } from './orgao';

// Um vínculo de deputado com órgão em uma legislatura (cargo + período). O
// arquivo tem repetições legítimas de deputado+órgão+cargo com períodos
// diferentes, então não há unicidade além do id: a carga é por substituição
// de recorte (legislatura), não por upsert.
export const deputadoOrgao = pgTable(
  'deputado_orgao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    orgaoId: uuid('orgao_id')
      .notNull()
      .references(() => orgao.id),
    legislaturaId: uuid('legislatura_id')
      .notNull()
      .references(() => legislatura.id),
    cargo: text('cargo'),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
  },
  (table) => [index('deputado_orgao_deputado_id_idx').on(table.deputadoId)],
);
