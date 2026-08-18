import { integer, jsonb, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

// Uma linha por deputado e ano, mesmo grão de deputado_gasto_cota: toda
// leitura do perfil quer o ano inteiro.
export const deputadoProposicaoAssinada = pgTable(
  'deputado_proposicao_assinada',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    year: integer('year').notNull(),
    // { dia: [assinadas, primeiras] }
    assinaturasJson: jsonb('assinaturas_json').notNull(),
    // { siglaTipo: [assinadas, primeiras] }
    composicaoJson: jsonb('composicao_json').notNull(),
  },
  (table) => [
    unique('deputado_proposicao_assinada_deputado_id_year_unique').on(
      table.deputadoId,
      table.year,
    ),
  ],
);
