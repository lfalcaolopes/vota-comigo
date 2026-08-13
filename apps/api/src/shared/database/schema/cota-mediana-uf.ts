import {
  bigint,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Pré-calculada na carga: em runtime, cada leitura de perfil teria que somar os
// agregados de todos os deputados do estado.
export const cotaMedianaUf = pgTable(
  'cota_mediana_uf',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    siglaUf: text('sigla_uf').notNull(),
    valorUtilizadoMediana: bigint('valor_utilizado_mediana', {
      mode: 'number',
    }).notNull(),
    // Publicado junto com a mediana: esconder o denominador esconde que ela
    // pode vir de três deputados.
    deputadoCount: integer('deputado_count').notNull(),
  },
  (table) => [
    unique('cota_mediana_uf_year_sigla_uf_unique').on(
      table.year,
      table.siglaUf,
    ),
  ],
);
