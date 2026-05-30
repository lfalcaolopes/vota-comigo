import { date, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';

export const legislatura = pgTable('legislatura', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdLegislatura: smallint('external_id_legislatura').notNull().unique(),
  uri: text('uri'),
  dataInicio: date('data_inicio'),
  dataFim: date('data_fim'),
  anoEleicao: smallint('ano_eleicao'),
});
