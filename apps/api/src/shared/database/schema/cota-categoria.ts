import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const cotaCategoria = pgTable('cota_categoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalNumSubCota: integer('external_num_sub_cota').notNull().unique(),
  descricao: text('descricao').notNull(),
});
