import {
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

// Uma linha por deputado e ano: toda leitura do perfil quer o ano inteiro, e o
// grão relacional (mês x categoria) custava dez vezes mais em disco.
export const deputadoGastoCota = pgTable(
  'deputado_gasto_cota',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    year: integer('year').notNull(),
    // UF do arquivo da cota, não do snapshot: o snapshot é o estado mais
    // recente e atribuiria a UF de hoje a um ano antigo.
    siglaUf: text('sigla_uf').notNull(),
    // { mês: { numSubCota: centavos } }
    gastosJson: jsonb('gastos_json').notNull(),
  },
  (table) => [
    unique('deputado_gasto_cota_deputado_id_year_unique').on(
      table.deputadoId,
      table.year,
    ),
  ],
);
