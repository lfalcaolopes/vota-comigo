import { integer, jsonb, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

// A presença da linha (deputado_id, year) é o sinal de deputado-ano já
// consultado na API (ADR 022, no molde do sinal derivado do banco da ADR
// 011); gastos_json vazio é resultado legítimo — deputado que não voou —,
// não "ainda não buscado". sigla_uf não é armazenada: é propriedade da
// linha do dump, e o endpoint de despesas não a retorna.
export const deputadoGastoCotaSigepa = pgTable(
  'deputado_gasto_cota_sigepa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    year: integer('year').notNull(),
    // { mês: centavos }
    gastosJson: jsonb('gastos_json').notNull(),
  },
  (table) => [
    unique('deputado_gasto_cota_sigepa_deputado_id_year_unique').on(
      table.deputadoId,
      table.year,
    ),
  ],
);
