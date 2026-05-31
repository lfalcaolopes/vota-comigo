import {
  char,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { deputado } from './deputado';
import { legislatura } from './legislatura';
import { partido } from './partido';

export const deputadoHistorico = pgTable(
  'deputado_historico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    legislaturaId: uuid('legislatura_id')
      .notNull()
      .references(() => legislatura.id),
    partidoId: uuid('partido_id').references(() => partido.id),
    dataHora: timestamp('data_hora', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    situacao: text('situacao'),
    condicaoEleitoral: text('condicao_eleitoral'),
    descricaoStatus: text('descricao_status').notNull(),
    nome: text('nome'),
    nomeEleitoral: text('nome_eleitoral'),
    siglaUf: char('sigla_uf', { length: 2 }),
    email: text('email'),
    urlFoto: text('url_foto'),
  },
  (table) => [
    unique('deputado_historico_evento_unico').on(
      table.deputadoId,
      table.dataHora,
      table.descricaoStatus,
    ),
    index('deputado_historico_deputado_data_idx').on(
      table.deputadoId,
      table.dataHora.desc(),
    ),
  ],
);
